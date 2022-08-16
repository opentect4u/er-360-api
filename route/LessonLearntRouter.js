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

LessonRouter.get('/media_rel', async (req, res) => {
    var id = req.query.id,
        inc_id = req.query.inc_id,
        table_name = 'td_media_release',
        select = `id, inc_id, rel_no, date, time, location, description, contact_name, contact_info`,
        where = id > 0 ? `id = ${id}` : (inc_id > 0 ? `inc_id = ${inc_id}` : '')
    order = null;
    var dt = await F_Select(select, table_name, where, order);
    res.send(dt)
})

LessonRouter.post('/media_rel', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'td_media_release',
        fields = data.id > 0 ? `inc_id = "${data.inc_id}", rel_no = "${data.rel_no}", date = "${data.date}", time = "${data.time}", location = "${data.location}", description = "${data.description}", contact_name = "${data.contact_name}", contact_info = "${data.contact_info}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(inc_id, rel_no, date, time, location, description, contact_name, contact_info, created_by, created_at)',
        values = `("${data.inc_id}", "${data.rel_no}", "${data.date}", "${data.time}", "${data.location}", "${data.description}", "${data.contact_name}", "${data.contact_info}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `Media release form is ${flag_type} by ${data.contact_name}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

module.exports = { LessonRouter }