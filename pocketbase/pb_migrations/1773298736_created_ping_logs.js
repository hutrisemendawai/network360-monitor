/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3329488164",
        "hidden": false,
        "id": "relation3776289157",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "monitor",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "number372847879",
        "max": null,
        "min": 0,
        "name": "latency_ms",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "bool2660391474",
        "name": "is_packet_loss",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "pbc_416662387",
    "indexes": [],
    "listRule": "monitor.user = @request.auth.id",
    "name": "ping_logs",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "monitor.user = @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_416662387");

  return app.delete(collection);
})
