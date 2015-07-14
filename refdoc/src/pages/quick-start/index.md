---
layout: main.html
---

# Getting Started
___Seneca___ is based on a few patterns and practices that are not as widespread as many others. With this in
mind we have put together a complete starter guide which covers all of the topics needed to build real world
microservices.

- [Microservices 101]()
- [Your first microservice]()
- [Creating a client]()
- [Adding storage]()
- [Deploying with nScale]()

## Microservices 101
To understand what benefits ___Seneca___ provides, it is helpful to understand the concept it is based
upon, microservices. The truth is, the exact opinion on what a microservice is and what it should do will
vary depending on who you ask. One rule everyone agrees on however, is:

> A microservice should be a small, singularly purposed, unit of functionality.

It should come as no surprise that the rule above is open ended, all good rules are. As long as you can satisfy
the above, the rest is malleable.

### Breaking down Monoliths
Regardless of the particular methods of construction, the vast majority of software in production today could
be classed as monolithic. Developers and Managers alike spend an inordinate amount of time decoupling at the
library level only to glue it all together in a single digit number of processes, usually one for the database,
one for each client, and one for the server.

Microservices shift the boundaries in your application by breaking up the constitute parts of your app into
a collection of small services each existing as it's own process, free of the others. Duplication will most
definitely increase but this is on purpose, as we will see later.

#### Identifying Boundaries
Consider a typical business level application, say a widget factory management system. Regardless of what code
level architecture is in place the actual Boundaries of of this application will be:

- Server side app
- Client side app
- Database

The interesting thing about software is when it breaks, it will break across a whole boundary. If a bug is
introduced when adding new accounting functionality, it will almost certainly impact the users of other
sections of the app, the real question is usually by how much.

Microservices instead propose that software boundaries align with a single unit of functionality. In the case
of our widget factory our boundaries would look closer to this:

- Goods In
- Production
- Inventory
- Outsort
- Invoicing
- Client side app

Each item on the list exists as a single process app. Each contains all the functionality necessary to complete
it's role, that includes databases.

#### Enforcing Boundaries
The key to good quality microservices, is not in identifying the boundary but how you enforce it. Lets look at Goods
In as an example, if we where to enforce a boundary around this service what would (some of) it look like?

| Concern             | Action      |
|---------------------|-------------|
| goods-recieved-note | create      |
| goods-recieved-note | delete      |
| goods-recieved-note | add-line    |
| goods-recieved-note | remove-line |
