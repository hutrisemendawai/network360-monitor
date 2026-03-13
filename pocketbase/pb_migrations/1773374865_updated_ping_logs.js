/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_416662387")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number2750318623",
    "max": 255,
    "min": 0,
    "name": "ttl",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number2251281184",
    "max": null,
    "min": 0,
    "name": "jitter_ms",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_416662387")

  // remove field
  collection.fields.removeById("number2750318623")

  // remove field
  collection.fields.removeById("number2251281184")

  return app.save(collection)
})
