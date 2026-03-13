/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3329488164")

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text72815716",
    "max": 2000,
    "min": 0,
    "name": "dpi_protocols",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2167136951",
    "max": 1000,
    "min": 0,
    "name": "dpi_open_ports",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1674639697",
    "max": 100,
    "min": 0,
    "name": "dpi_qos_class",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3329488164")

  // remove field
  collection.fields.removeById("text72815716")

  // remove field
  collection.fields.removeById("text2167136951")

  // remove field
  collection.fields.removeById("text1674639697")

  return app.save(collection)
})
