const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const fs = require('fs');
const upload = require('express-fileupload')

const LessonRouter = express.Router();
LessonRouter.use(upload());

LessonRouter.get('/lesson', async (req, res) => {
    var id = req.query.id,
        inc_id = req.query.inc_id,
        dt = '',
        select, table_name, where, order;
    if (id > 0) {
        table_name = 'td_lesson a LEFT JOIN td_lesson_file b ON a.id=b.lesson_id AND a.inc_id=b.inc_id'
        select = `a.id, a.inc_id, a.reff_no, a.title, a.date, a.description, a.recom, IF((SELECT COUNT(c.id) FROM td_lesson_file c WHERE a.id=c.lesson_id AND a.inc_id=c.inc_id) > 0, 1, 0) isFile, b.file_name, b.file_path`
        where = inc_id > 0 ? `a.inc_id = ${inc_id}` : (id > 0 ? `a.id = ${id}` : '')
        order = null;
        dt = await F_Select(select, table_name, where, order)
    } else {
        table_name = 'td_lesson a'
        select = `a.id, a.inc_id, a.reff_no, a.title, a.date, a.description, a.recom`
        where = inc_id > 0 ? `a.inc_id = ${inc_id}` : (id > 0 ? `a.id = ${id}` : '')
        order = null
        dt = await F_Select(select, table_name, where, order)
    }
    res.send(dt)
})

module.exports = { LessonRouter }