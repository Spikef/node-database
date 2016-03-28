var recordSet = require('../lib/recordSet.js');

var data = {
    fields: ['id', 'name', 'title'],
    values: [
        [1, 'aa', '宁静的夏天'],
        [2, 'bb', '知了在唱歌']
    ]
};

var rs = new recordSet(data, "select * from a");

console.log(rs.Fields('name').Value);