const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const fs = require('fs');
const upload = require('express-fileupload')

const RepoRouter = express.Router();
RepoRouter.use(upload());

/////////////////// REPOSITORY CATEGORY /////////////////
RepoRouter.get('/repository_category', async (req, res) => {
    var flag = req.query.flag,
		table_name = 'md_repository_category',
        select = 'id, catg_name, DATE_FORMAT(created_at, "%d/%m/%Y %h:%i:%s %p") AS created_at, created_by',
        whr = `delete_flag = 'N'`,
		order = flag == 'D' ? `ORDER BY created_at DESC` :(flag == 'N' ? `ORDER BY catg_name` : null);
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

RepoRouter.post('/repository_category', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var dt = await CreateRepositoryCategory(data, datetime)
    res.send(dt)
})

// SEPARATE THE FUNCTION TO CALL THIS FUNCTION IN CREATE INCIDENT MODULE
const CreateRepositoryCategory = async (data, datetime) => {
    var table_name = 'md_repository_category',
        fields = '(catg_name, delete_flag, created_by, created_at)',
        values = `("${data.catg_name}", "N", "${data.user}", "${datetime}")`,
        whr = null,
        flag = 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    // store record in td_activity
    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `A Repository Category Named, ${data.catg_name} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
}

RepoRouter.get('/repository_category_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var res_dt = '';
    var data = req.query;
    //var table_name = 'md_form_category',
    //    fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
    //    values = null,
    //    whr = `id = ${data.id}`,
    //    flag = 1;

    var table_name = 'md_repository_category',
		select = 'catg_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
	var cat_name = select_dt.msg[0].catg_name;
	cat_name = cat_name.split(' ').join('_');
	var dir = 'assets/repository/' + cat_name;
	fs.rmdir(dir, { recursive: true }, async (err) => {
        if (err) {
			res_dt = {suc: 0, msg: err};
        }else{
			var del_table_name = 'md_repository_category',
				del_whr = `id = ${data.id}`,
				del_cat = await F_Delete(del_table_name, del_whr);
			var del_file_table_name = 'td_repository',
				del_file_whr = `catg_id = ${data.id}`,
				del_file = await F_Delete(del_file_table_name, del_file_whr);
			var user_id = data.user,
				act_type = 'D',
				activity = `A Repository Category Named, ${select_dt.msg[0].catg_name} IS DELETED By ${user_id} At ${datetime}`;
			var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
			res_dt = {suc: 1, msg: 'Deleted Successfully!!'};
		}
        res.send(del_cat);
    });
})
///////////////////////////////////////////////////

/////////////////// REPOSITORY /////////////////
RepoRouter.get('/get_repository', async (req, res) => {
    var flag = req.query.flag,
		catg_id = req.query.catg_id,
		catg_id_con = catg_id ? `AND a.catg_id = "${catg_id}"` : '',
        table_name = 'td_repository a, md_repository_category b',
        select = 'a.id, a.form_name, b.catg_name, a.form_path, DATE_FORMAT(a.created_at, "%d/%m/%Y %h:%i:%s %p") AS created_at, a.created_by',
        whr = `a.catg_id=b.id AND a.delete_flag = 'N' ${catg_id_con}`,
        order = flag == 'D' ? `ORDER BY a.created_at DESC` : (flag == 'A' ? `ORDER BY a.form_name` : (flag == 'Z' ? `ORDER BY a.form_name DESC` : null));
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
    //`SELECT ${select} FROM ${table_name} ${whr}`
})

RepoRouter.get('/repository_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'td_repository',
        fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `id = ${data.id}`,
        flag = 1;

    var select = 'form_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
    var user_id = data.user,
        act_type = 'D',
        activity = `A Form Named, ${select_dt.msg[0].form_name} IS DELETED`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
///////////////////////////////////////////////////

module.exports = { RepoRouter, CreateRepositoryCategory };