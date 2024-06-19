---
title: Reducing Unit Test Runtime - 9 Easy Steps
summary: Number 8 won't surprise you
tags: ['typescript', 'startups']
draft: false
layout: PostSimple
date: '2024-06-19'
---

## Intro

Unit tests are important. CI is important. 

As a team, it is a straightforward decision to commit to testing your collective work. 

But what happens years later when you've launched a successful product with hundreds or thousands of unit tests? When running CI takes 10 minutes, 30 minutes, or more? 

## Setting the Scene

For the purposes of this blog post, I'll walk through what I did to reduce the total runtime of our Github Actions CI from 21 minutes to 2 minutes. Our stack is a Typescript monorepo with React/Next.js on the front end and a Node api on the back end. 

There are many ways to peel an orange! Some creative thinking is required, as different teams have different goals depending on factors such as...

* Size and strengths of the team
* Unique challenges and risks for your product
* Stack and systems in play

Our current setup involves many more api unit tests than React. While we are working on improving our React coverage, we rely heavily on Playwright automation for end to end UI tests &mdash; outside the scope of this post. We'll hone in on these api tests.

The api tests primarily consist of... 
* Mock heavy tests for the service layer
* Roundtrip database calls for the database layer (with built-in testbed seeds)
* Several end-to-end controller -> database roundtrip tests
* A few integration tests against third parties 

We benefit heavily from the slower and more fragile tests that integrate with the database and third parties, and would be loathe to mock everything, but there is quite a delicate balance between test value and developer efficiency. Let's try to have it all. :)

## Approach

From a 10,000 foot view, there are hardware changes and software changes.

Unsurprisingly, more than a third of time savings boils down to upgrading to a beefier CI container. However, plenty of software optimisations had to occur prior in order to realize those gains. 

To put this into perspective, simply changing the container without any software optimisations yielded 4 minutes of time savings (21 minutes to 17), while switching containers after the software changes yielded 7 minutes of time savings (9 minutes to 2) - a 19% speedup versus a 78% speedup. 

And the software updates are the fun part anyway, so let's get into it!

## Foundational Work
***

### 1. Dump `jest`, move to `vitest`

Jest has been problematic for a while. The esm/commonjs schism is quite difficult to manage with Jest. While it likely isn't Jest's issue, supporting ESM modules via either an "experimental" flag or `transformIgnorePatterns` is annoying to work with. We recently moved to `vitest` for one of our React projects, so we thought why not give this a shot for our Node API?

The next reason to move to `vitest` I'll explore later &mdash; better support for parallel runs.

### Speed rating: 1/10 (but this was a necessary foundation)

<br/>

## 2. Implement fork pool with forks ~= cores

All of our 700+ api tests are now run in parallel in a fork pool. Vitest supports a fork pool as well as threads, but the threading approach was DOA in my experience &mdash; either running out of memory, or poisoning global bits and bobs that would cause other threads to fail. 

Forks may be a tad slower but are nice and clean &mdash; separate processes with less shared state. Jest doesn't have nearly the support for this that `vitest` does, which means moving to `vitest` was a solid foundational step here. 

### Speed rating: 9/10

<br/>

## High Impact, Heavy Lift
***

### 3. Separate databases with setup/teardown per fork

Now that we're in a fork pool we need to draw clear boundaries between the concurrently running tests. This is a general principle in horizontal scaling &mdash; once processes are truly independent (or shared dependencies are clearly defined and extracted), scaling becomes an easier problem to solve because you can simply throw more resources at the problem. As mentioned earlier, our data layer tests do talk to a real Postgres database, and we'd rather not switch to even Sqlite because a different dialect could hide subtle bugs or require us to skip tests that exercise Postgres-specific features.

Our data layer uses `knex`, with seed files that create common database scenarios that all unit tests can benefit from. Therefore, the test setup/teardown process truncates all tables (using `knex-cleaner`) between runs. Seed setup and teardown is only as efficient as these seed files, which I'll investigate in more detail later. 

Moving to the fork pool forced our hand on one primary change &mdash; multiple databases per fork. Fortunately, `knex-db-manager` exists for this exact scenario. 

With this library we now bootstrap a new database in the `beforeAll` lifecycle hook, which a newly granted fork in the fork pool runs before running tests, using a naming convention `test_<uuid>` to ensure a unique handle for this fork's database.

### Speed rating: 9/10
<br/>

### 4. Dirty flag for seeds

That shared testbed of seed data I mentioned? That was being set up and torn down on every single unit test. That causes a fair amount of churn. Not every test actually mutates the testbed. 

The speedup here is simple &mdash; only clean the seed testbed if the data was mutated. This implementation required creating a globally mutable `isDirty` flag for the tests in the `setupTests` file. Then we create lifecycle hooks using knex functionality to monitor sql going in and out &mdash; when an `INSERT`, `UPDATE`, or `DELETE` is detected (of course, ignoring the seed run itself!) we set `isDirty = true`. 

### Speed rating: 7/10
<br/>

## Low Impact, Low Lift
***

### 5. Cache the `pnpm` install directory on CI

The pnpm cache step on a github action is quite fragile, but essentially fingerprints the pnpm-lock file as the key, and if a match is found, re-loads the npm/pnpm data from the cache, rather than reinstalling. For some reason, `pnpm` caching requires more config than `npm` or `yarn` caching.

This cache step still doesn't work as often as I think it should, but when it does, it shaves another minute off of our runtime. I'm hoping that this situation improves over time, but for now, it's better than nothing.

### Speed rating: 2/10
<br/>

### 6. Optimize the seed files

Several of our seed files ran single row `awaits` serially, causing many database roundtrips. The optimization here is to add more data in a single call. I was able to update one or two of the files, but there are still low hanging enhancements. Since the `isDirty` flag means that the seeds don't run as often, this wasn't as pressing of a need, so I grabbed a few performance enhancements and moved on.

### Speed rating: 3/10 (but more to come!)
<br/>

### 7. Cache network calls

We keep an in-memory registry of our company's product configuration. It is core to many of the api services and front end calls as well. On the Node server, it collates data from a few sources when the server starts up and keeps that info in memory for the lifetime of the process. However, the lifetime of a fork in a forkpool is quite short! 

I implemented a strategy to cache these configuration payloads in a `./.vitest/` folder, added that to `.gitignore`, and updated our `clean` targets to clean this folder as well. Next, using a `vitest` global mock, we augment the configuration registry to check if that file exists first, and read that info into memory, skipping the network call.

### Speed rating: 3/10
<br/>

## "Cheating"
*** 

### 8. Beefy boy hardware

Now that we've made the tests much more efficient by allowing them to run in parallel and trimming down IO (where CPU/memory resources would be sitting idle), we can throw more resources at the problem. I upgraded our Github action docker container to the 16 core machine, which is currently billed at 6 cents per minute. 

I've yet to run this for a month to see how this affects our Github billing, but conservatively for 7 devs, 3 minutes per CI run, maybe 3 CI runs per day per dev, we're looking at 75 dollars per month. Add some dependabots and fudge for deploys, let's call it $150. 

Money well spent.

### Speed rating: 9/10
<br/>

### 9. Parallel suite execution

We had previously run our suites (one React app, the api, some common libraries) in serial &mdash; one right after the other. In theory, this would allow a failure of common libraries to fail fast &mdash; you may not need to know whether the api tests succeed if you have a test failure in a shared library. In practice, it's simpler and more efficient to just throw a single step in using `pnpm test`. This way all suites fork to run independently in parallel, all test execution results are still accounted for, and coverage is included in this step and reported on later. 

This saved a minute or two, because the total runtime of `pnpm test` is now as long as our api test runtime (the longest running suite).

### Speed rating: 8/10
<br/>

## Conclusion
***

As you can see, with a little bit of creative thinking, beefier hardware, and more efficient test execution, it is possible to keep high value tests while reducing overall test suite runtime.

## Afterword &mdash; a Musing on Testing Strategy
Finding the optimal testing strategy is quite the balancing act, and even the entirety of the unit test suite is only a small slice of the overall testing pie. The major considerations are coverage and software quality, but developer experience is just as important. 

The developer experience for creating and maintaining a rich set of tests must stay as frictionless as possible, while allowing high value tests to be written. Although mocking is nice for business rule service layer code, often it is only as good as the developer expectations for how the mocked code (or third party) works, which is frequently a source of bugs that aren't found until regression or worse. 

When bugs are found during unit testing, it only hampers that developer's productivity (and results in a valuable artifact &mdash; the unit test itself).  When a bug is found in regression or in production, more operational churn is produced (and worst case &mdash; lost revenue or unhappy customers). 

In short, prioritizing tooling and development quality of life encourages behavior that is beneficial to long term success. Teams can create coverage thresholds and enforce with impunity, but with a slow and onerous feedback loop, it will only kill motivation and make lives miserable.
