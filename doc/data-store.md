

## Entity messsage patterns

Each data store must define these patterns:

   * role:entity, cmd:load   - load a single entity, if it exists
   * role:entity, cmd:save   - save a single entity, creating it if needed
   * role:entity, cmd:list   - list entities matching a query condition
   * role:entity, cmd:remove - remove an entity
   * role:entity, cmd:native - provide access to the natuve driver

If the data store is loaded under an entity mapping, then the
following additional keys will potentially be part of pattern:

   * name
   * base
   * zone


Data stores may optionally define:

   * init:<store-name>, tag:<store-tag> - initialize the store (i.e. connect to the database)

Data stores may optionally subscribe to:

   * role:seneca, cmd:close - service shutdown; close database connection


## Pattern parameters

The role:entity, cmd:load;save;list;remove patterns must accept the
following parameters:

   * name: the name of the data entity, required
   * base: a namespace for the data entity, optional
   * zone: a metaspace for the data entity, optional


### cmd:load

This pattern must accept:

   * q: query to select an entity from the underlying data store

The query specifies a set of entity data fields that must match the
given values exactly. For example:

   * `q = {id:1}`: find the entity with _id_ field equal to `1`
   




