require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const https = require("https");
const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.set("strictQuery", false);

async function connectDB() {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("MongoDB Connected: " + conn.connection.host);
    } catch (error) {
        console.log(error);
        process.exit(1);
    };
};

const itemsSchema = { name: String };

const Item = mongoose.model("item", itemsSchema);

const item1 = new Item({ name: "Welcom to your todo list" });

const item2 = new Item({ name: "Hit the + button to add the new item." });

const item3 = new Item({ name: "<-- Hit this button to delete an item" });

const defaultItems = [item1, item2, item3];

const listSchema = { name: String, items: [itemsSchema] };

const List = mongoose.model("List", listSchema);

app.get("/", async function (req, res) {
    await Item.find({})
        .then(function (foundItems) {
            if (foundItems.length === 0) {
                Item.insertMany(defaultItems)
                    .then(function () { res, redirect("/"); })
                console.log("Successfully saved default items to DB!")
            } else {
                res.render("list", { listTitle: "Today", newListItems: foundItems });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});

app.post("/", async function (req, res) {

    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({ name: itemName });

    if (listName === "Today") {
        await item.save();
        res.redirect("/");
    } else {
        List.findOne({ name: listName })
            .then(async function (foundList) {
                foundList.items.push(item);
                await foundList.save();
                res.redirect("/" + listName);
            })
            .catch(function (err) {
                console.log("error save new item in custom list");
            });
    }
});

app.post("/delete", async function (req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "Today") {
        Item.findByIdAndRemove(checkedItemId)
            .then(function () {
                res.redirect("/")
            })
            .catch(function () {
                console.log("delete error");
            });
    } else {
        List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: { _id: checkedItemId } } }
        )
            .then(function (foundList) {
                res.redirect("/" + listName);
            })
            .catch(function (err) {
                console.log("err in delete item from custom list");
            });
    }
});

app.get("/:customListName", async function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    await List.findOne({ name: customListName })
        .then(async function (foundList) {
            if (!foundList) {
                const list = new List({ name: customListName, items: defaultItems });
                await list.save();
                res.redirect("/" + customListName)
            } else {
                res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
});

app.get("/about", function (req, res) {
    res.render("about");
});

connectDB().then(function () {
    app.listen(PORT, function () {
        console.log("Server is running on port " + PORT);
    });
});

// process.env.PORT || 