/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_416662387")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "autodate2811070375",
    "name": "logged_at",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_416662387")

  // remove field
  collection.fields.removeById("autodate2811070375")

  return app.save(collection)
})
