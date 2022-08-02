const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const fs = require('fs');
const upload = require('express-fileupload')

const FormRouter = express.Router();
FormRouter.use(upload());

/////////////////// GET CATEGORY OF FORMS /////////////////
FormRouter.get('/form_category', async (req, res) => {
    var flag = req.query.flag,
		table_name = 'md_form_category',
        select = 'id, catg_name, DATE_FORMAT(created_at, "%d/%m/%Y %h:%i:%s %p") AS created_at, created_by',
        whr = `delete_flag = 'N'`,
		order = flag == 'D' ? `ORDER BY created_at DESC` :(flag == 'N' ? `ORDER BY catg_name` : null);
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
})

FormRouter.post('/form_category', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'md_form_category',
        fields = '(catg_name, delete_flag, created_by, created_at)',
        values = `("${data.catg_name}", "N", "${data.user}", "${datetime}")`,
        whr = null,
        flag = 0,
		flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';
	
	// store record in td_activity
	var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `A Form Category Named, ${data.catg_name} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
	
    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

FormRouter.get('/form_category_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
	var res_dt = '';
    var data = req.query;
    //var table_name = 'md_form_category',
    //    fields = `delete_flag = "Y", modified_by = "${data.user}", modified_at = "${datetime}"`,
    //    values = null,
    //    whr = `id = ${data.id}`,
    //    flag = 1;

    var table_name = 'md_form_category',
		select = 'catg_name',
        select_whr = `id = ${data.id}`;
    var select_dt = await F_Select(select, table_name, select_whr, null);
	var cat_name = select_dt.msg[0].catg_name;
	cat_name = cat_name.split(' ').join('_');
	var dir = 'assets/forms/' + cat_name;
	fs.rmdir(dir, { recursive: true }, async (err) => {
        if (err) {
            //throw err;
			res_dt = {suc: 0, msg: err};
            //res.send(err)
        }else{
			var del_table_name = 'md_form_category',
				del_whr = `id = ${data.id}`,
				del_cat = await F_Delete(del_table_name, del_whr);
			var del_file_table_name = 'td_forms',
				del_file_whr = `catg_id = ${data.id}`,
				del_file = await F_Delete(del_file_table_name, del_file_whr);
			var user_id = data.user,
				act_type = 'D',
				activity = `A Form Category Named, ${select_dt.msg[0].catg_name} IS DELETED By ${user_id} At ${datetime}`;
			var activity_res = await CreateActivity(user_id, datetime, act_type, activity);
			res_dt = {suc: 1, msg: 'Deleted Successfully!!'};
		}
        //console.log(`${dir} is deleted!`);
        res.send(del_cat);
    });
    
    // var dt = await F_Insert(table_name, fields, values, whr, flag);
    //res.send(dt)
})
///////////////////////////////////////////////////

/////////////////// FORMS /////////////////
FormRouter.get('/get_forms', async (req, res) => {
    var flag = req.query.flag,
		catg_id = req.query.catg_id,
		form_type_con = flag && flag != null && flag != 'null' && flag != 'D' && flag != 'N' ? `AND a.form_type = '${flag}'` : '',
		catg_id_con = catg_id ? `AND a.catg_id = "${catg_id}"` : '',
		table_name = 'td_forms a, md_form_category b',
        select = 'a.id, a.catg_id, b.catg_name, a.form_type, a.form_name, a.form_path, DATE_FORMAT(a.created_at, "%d/%m/%Y %h:%i:%s %p") AS created_at, a.created_by',
        whr = `a.catg_id=b.id AND a.delete_flag = 'N' AND b.delete_flag = 'N' ${form_type_con} ${catg_id_con}`,
		order = flag == 'D' ? `ORDER BY a.created_at DESC` : (flag == 'N' ? `ORDER BY a.form_name` : null);
    var dt = await F_Select(select, table_name, whr, order);
    res.send(dt);
	//`SELECT ${select} FROM ${table_name} ${whr}`
})

FormRouter.post('/get_forms', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
	var up_file = req.files ? (req.files.file ? req.files.file : null) : null,
		path = '',
		cat_name = data.catg_name.toLowerCase(),
		file_name = '',
		file_path = '';
	cat_name = cat_name.split(' ').join('_');
	var dir = 'assets/forms',
		subdir = dir + '/' + cat_name;
	if (!fs.existsSync(subdir)) {
		fs.mkdirSync(subdir);
	}
	if(up_file){
		file_name = up_file.name;
		file_name = file_name.split(' ').join('_');
		path = `assets/forms/${cat_name}/${file_name}`;
		file_path = `forms/${cat_name}/${file_name}`;
		up_file.mv(path, async (err) => {
            if (err) {
                console.log(`${file_name} not uploaded`);
            } else {
                console.log(`Successfully ${file_name} uploaded`);
                // await SectionImageSave(data, filename);
            }
        })
	}else{
		file_name = '';
	}
    var table_name = 'td_forms',
    fields = '(catg_id, form_type, form_name, form_path, delete_flag, created_by, created_at)',
    values = `("${data.catg_id}", "${data.form_type}", "${data.form_name}", "${file_path}", "N", "${data.user}", "${datetime}")`,
    whr = null,
    flag = 0,
    flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

	// store record in td_activity
	var user_id = data.user,
		act_type = flag > 0 ? 'M' : 'C',
		activity = `A Form Named, ${data.form_name} IS ${flag_type}`;
	var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

	var dt = await F_Insert(table_name, fields, values, whr, flag);
	res.send(dt)
})

FormRouter.get('/forms_del', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.query;
    var table_name = 'td_forms',
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

////////////////////// SAVE REPOSITORY FILES /////////////////////////////
FormRouter.post('/get_repository', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var up_file = req.files ? (req.files.file ? req.files.file : null) : null,
        path = '',
		cat_name = data.catg_name.toLowerCase(),
        file_name = '',
        file_path = '';
    cat_name = cat_name.split(' ').join('_');
	var dir = 'assets/repository',
		subdir = dir + '/' + cat_name;
	if (!fs.existsSync(subdir)) {
		fs.mkdirSync(subdir);
	}
	
    if (up_file) {
        file_name = up_file.name;
        file_name = file_name.split(' ').join('_');
        path = `assets/repository/${cat_name}/${file_name}`;
        file_path = `repository/${cat_name}/${file_name}`;
        up_file.mv(path, async (err) => {
            if (err) {
                console.log(`${file_name} not uploaded`);
            } else {
                console.log(`Successfully ${file_name} uploaded`);
                // await SectionImageSave(data, filename);
            }
        })
    } else {
        file_name = '';
    }
    var table_name = 'td_repository',
        fields = '(catg_id, form_name, form_path, delete_flag, created_by, created_at)',
        values = `("${data.catg_id}", "${data.form_name}", "${file_path}", "N", "${data.user}", "${datetime}")`,
        whr = null,
        flag = 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    // store record in td_activity
    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `A Repository Named, ${data.form_name} IS ${flag_type}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})

////////////////////////////// USER PROFILE IMAGE UPLOAD /////////////////////////////////
FormRouter.post('/update_pro_pic', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var up_file = req.files ? (req.files.file ? req.files.file : null) : null,
        path = '',
        file_name = '',
        file_path = '';
	var dir = 'assets/uploads';
	
    if (up_file) {
        file_name = up_file.name;
        file_name = file_name.split(' ').join('_');
        path = `${dir}/${file_name}`;
        file_path = `uploads/${file_name}`;
        up_file.mv(path, async (err) => {
            if (err) {
                console.log(`${file_name} not uploaded`);
            } else {
                console.log(`Successfully ${file_name} uploaded`);
                // await SectionImageSave(data, filename);
            }
        })
		var table_name = 'md_employee',
        fields = `img="${file_path}", modified_by = "${data.user}", modified_at = "${datetime}"`,
        values = null,
        whr = `employee_id = "${data.emp_id}"`,
        flag = 1,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

		// store record in td_activity
		var user_id = data.user,
			act_type = flag > 0 ? 'M' : 'C',
			activity = `An Employee, ${data.emp_name} has changed his profile picture AT ${datetime}`;
		var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

		var dt = await F_Insert(table_name, fields, values, whr, flag);
		res.send(dt)
    } else {
        file_name = '';
		res.send({suc:0, msg: "No file selected"});
    }
    
})
//////////////////////////////////////////////////////////////////////////////////////////

module.exports = { FormRouter };