var options = {
    sqlite: {
        "dbType": 3,
        "dbPath": "./test.db"
    }
}

var db = require('node-database');

// 创建数据库
//db.createDatabase(options.sqlite);

// 连接数据库
//db.connect(options.sqlite);

// 创建表
//var fields = [
//    "id identity primary key",
//    "title varchar(255) null unique",
//    "content text not null",
//    "username varchar(10) default('沈赟杰')",
//    "posttime datetime not null",
//    "stars int not null default(0)",
//    "allow bit default 0"
//];
//
//var successful = db.createTable("article", fields);
//console.log(successful);

// 插入记录
//var fields = {
//    title: "这是一个美好的夜晚6",
//    content: "nodeAsp 是一套ASP的模块化架构框架，移植于nodejs，遵循commonjs规范。是ASP领域独树一帜的框架。它的出现改变了传统的ASP编写模式，让您可以像nodejs一样书写您的代码。\nnodeAsp拥有nodejs提供的50%的库使用，我们尽量做到与nodejs书写方式和调用模式一致。一切不关乎nodejs运行环境和ES5-ES6的模块都能直接同步使用。我们身后是强大的nodejs资源库。我们让人们看到了ASP的变革。虽然对于微软来说，ASP已经成为过去时，但是我们没有放弃对ASP功能和理念的强化。\n在ASP界，存在着2套类库框架EasyAsp和MoAsp，它们都是传统意义上的类库，与我们的框架，千差万别，我们绝对是ASP领域的终结者。我们的核心代码180+行实现。我们的功能扩展于nodejs。这么强大的框架是否会让您心动呢？",
//    posttime: new Date(),
//    allow: true
//};

//db.insert("article", fields);
//console.log(db.id);
//console.log(db.ar);

// 修改记录
//var fields = {
//    title: "跟我一起学node"
//}
//
//db.update("article", fields, "id=3");

// 删除记录
//db.remove("article", "*", "id=7");

// toJSON
//var ret = db.runsql("select top 1 * from article order by id desc").toJSON();
//console.log(ret);

// toArray
//var ret = db.runsql("select id, title from article").toArray();
//console.log(ret);

// forEach
//db.runsql("select id, title from article order by id").forEach(function(rec) {
//    console.log(rec)
//});

// each
//db.runsql("select id, title from article order by id").each(function(value, name, row, i) {
//    console.log(value, name, row, i);
//});

// 查找所有表
//var tables = db.getTables();
//console.log(tables);

// 获取版本号
//var version = db.getVersion();
//console.log(version);

// ============================== //

// 联表查询
options.sqlite.dbPath = './excms.db';
db.connect(options.sqlite);

// 单表查询
params = {
    action: "select",
    tables: "cms_news",
    fields: ["id", "posttime", "posttime"],
    where: "title like '菱湖%'",
    orders: "id desc",
    top: 4
};

// 单表查询，带*
//params = {
//    action: "select",
//    tables: "cms_news",
//    fields: "*",
//    where: "title like '菱湖%'",
//    orders: "id desc",
//    top: 4
//};

// 联表查询
//params = {
//    action: "select",
//    tables: ["cms_news as N", "cms_news_class as C"],
//    fields: ["N.id", "N.title", "N.posttime", "N.category", "N.poster", "C.id", "C.title as cate_title"],
//    where: "N.category=C.id and N.title like '菱湖%'",
//    orders: "N.id desc",
//    top: 4
//};

// 联表查询，带*
//params = {
//    action: "select",
//    tables: ["cms_news as N", "cms_news_class"],
//    fields: "N.id, N.title as N_title, cms_news_class.*",
//    where: "N.category=cms_news_class.id and N.title like '菱湖%'",
//    top: 1
//};

//params = {
//    action: "select",
//    tables: ["cms_news as N", "cms_news_class as M"],
//    fields: "N.id, N.title as N_title, M.*",
//    where: "N.category=M.id and N.title like '菱湖%'",
//    top: 1
//};

//var ret = db.select(params.tables, params.fields, params.where, params.orders, params.top).toJSON();
var ret = db.select(params).toJSON();
console.log(ret);

// 分页查询，有无别名均处理; *未处理
//var sql = "select N.id as Nid, N.title as Ntitle, N.category, C.id as Cid, C.title as Ctitle from cms_news as N, cms_news_class as C order by C.id, N.id";
//var sql = "select N.id, N.title as Ntitle, N.category, C.id, C.title as Ctitle from cms_news as N, cms_news_class as C order by C.id, N.id";
//var sql = "select N.id as Nid, N.title as Ntitle, N.category, C.id as Cid, C.title as Ctitle from cms_news as N, cms_news_class as C";
//var sql = "select N.id, N.title as Ntitle, N.category, C.id, C.title as Ctitle from cms_news as N, cms_news_class as C";
//var sql = "select * from cms_news as N, cms_news_class as C order by C.id, N.id";
//var sql = "select * from cms_news_class order by id";
//var ret = db.page(sql, 111, 2);
//console.log(ret);

db.close();