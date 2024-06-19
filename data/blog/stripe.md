---
title: Modeling Recurring Payments in Stripe
summary: Not as easy as you'd think
tags: ['typescript', 'react', 'startups']
draft: true
layout: PostSimple
date: '2024-01-21'
---

So you're setting up a site to take payments, you say? And once the customer signs up, you'll want to charge them on a recurring cadence? Read onward! This article is for you.

## Setting the context

Let's take a few minutes just to ensure Stripe is the way to go.

## Payment Gateways

First you'll need a payment gateway - a 3rd party that handles charging credit cards on behalf of your customers. There's actually a bit [more to this behind the scenes](https://stripe.com/resources/more/payment-processor-vs-payment-gateway). But generally at this stage let's just consider Stripe alternatives - you may elect for cheaper options if you're processing at scale, or something that plugs directly into your vendor software.

## Recurrence Provider

You'll also need software to manage the customer billing recurrence. This could be Stripe, it could be a vendor that sits on top of Stripe, or it could be completely homegrown. There are many alternatives! Recharge, Braintree Subscriptions, Chargebee, and more. This article focuses on Stripe. 

Consider, however, building your own recurrence engine! It's not too much work (just some date math), and allows you to completely customize the experience based on your customer's needs. My opinion on this space is that subscription management software is quite complex due to the nature of being forced to accommodate many different subscription recurrence scenarios. If you focus on your needs, you can cut out a bunch of complexity. 

## So you chose Stripe

There are many benefits to using Stripe. Massive customer base. Speedy support (drop into their Discord and ask them questions directly - you receive great answers from a real human). Reasonable pricing.

## What kind of recurrence do you need?

Stripe Subscriptions are the basic recurrence model. They fit a few different use cases, for example - 

* Metered access to a resource. In this model, the recurrence cadence is strict (billed first of the month, for instance), but the pricing changes depending on the amount used. There may be tiers - after 10,000 minutes, the price per minute either grows to disincentivize going over a threshold or shrinks to provide a bulk discount.

* 