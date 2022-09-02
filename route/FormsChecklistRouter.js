const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const fs = require('fs');
const upload = require('express-fileupload');
const { SaveLessonFinal, MakePDF, MeetingPdfGen } = require('./LessonLearntRouter');

const FormRouter = express.Router();
FormRouter.use(upload());

// var server_url = 'http://localhost:3000/'
var server_url = 'https://api.er-360.com/'

/////////////////// GET CATEGORY OF FORMS /////////////////
FormRouter.get('/form_category', async (req, res) => {
    var flag = req.query.flag,
        table_name = 'md_form_category',
        select = 'id, catg_name, DATE_FORMAT(created_at, "%d/%m/%Y %h:%i:%s %p") AS created_at, created_by',
        whr = `delete_flag = 'N'`,
        order = flag == 'D' ? `ORDER BY created_at DESC` : (flag == 'N' ? `ORDER BY catg_name` : null);
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
            res_dt = { suc: 0, msg: err };
            //res.send(err)
        } else {
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
            res_dt = { suc: 1, msg: 'Deleted Successfully!!' };
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
    if (up_file) {
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
    } else {
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
    console.log(req);
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
        res.send({ suc: 0, msg: "No file selected" });
    }

})
//////////////////////////////////////////////////////////////////////////////////////////

const lesson_file_save = (files, data) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        fileName = '',
        filePath = '',
        img_upload = '';
    var dir = 'assets/uploads',
        subdir = dir + '/lesson';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }
    return new Promise(async (resolve, reject) => {
        var table_name = 'td_lesson',
            fields = data.id > 0 ? `inc_id = "${data.inc_id}", reff_no = "${data.reff_no}", title = "${data.title}", date = "${data.date}", description = "${data.description}", recom = "${data.recom}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                `(inc_id, reff_no, title, date, description, recom, created_by, created_at)`,
            values = `("${data.inc_id}","${data.reff_no}","${data.title}","${data.date}","${data.description}","${data.recom}","${data.user}","${datetime}")`,
            where = data.id > 0 ? `id = ${data.id}` : null,
            flag = data.id > 0 ? 1 : 0;
        var inc_dt = await F_Insert(table_name, fields, values, where, flag)
        var lesson_id = inc_dt.suc > 0 ? (data.id > 0 ? data.id : inc_dt.lastId.insertId) : null
        // console.log(lesson_id);
        var res_dt = { suc: inc_dt.suc, msg: inc_dt.msg }
        if (files && lesson_id) {
            if (Array.isArray(files)) {
                for (let file of files) {
                    fileName = file.name
                    filePath = 'uploads/lesson/' + fileName
                    file.mv('assets/' + filePath, async (err) => {
                        if (err) {
                            console.log(`${fileName} not uploaded`);
                        } else {
                            console.log(`Successfully ${fileName} uploaded`);
                            fields = '(lesson_id, inc_id, file_name, file_path, created_by, created_at)'
                            values = `("${lesson_id}", "${data.inc_id}", "${fileName}", "${filePath}", "${data.user}", "${datetime}")`
                            table_name = 'td_lesson_file'
                            where = null
                            flag = 0
                            img_upload = await F_Insert(table_name, fields, values, where, flag)
                        }
                    })
                    if (img_upload.suc == 0) {
                        res_dt = { suc: 0, msg: `Error, While Uploading ${fileName}`, err: img_upload.msg }
                        break;
                    }
                }
                resolve(res_dt)
            } else {
                fileName = files.name
                filePath = 'uploads/lesson/' + fileName
                files.mv('assets/' + filePath, async (err) => {
                    if (err) {
                        console.log(`${fileName} not uploaded`);
                    } else {
                        console.log(`Successfully ${fileName} uploaded`);
                        fields = '(lesson_id, inc_id, file_name, file_path, created_by, created_at)'
                        values = `("${lesson_id}", "${data.inc_id}", "${fileName}", "${filePath}", "${data.user}", "${datetime}")`
                        table_name = 'td_lesson_file'
                        where = null
                        flag = 0
                        img_upload = await F_Insert(table_name, fields, values, where, flag)
                        if (img_upload.suc == 0) {
                            res_dt = { suc: 0, msg: `Error, While Uploading ${fileName}`, err: img_upload.msg }
                        }
                    }
                })
                resolve(res_dt)
            }
        } else {
            resolve(res_dt)
        }
    })
}

const lessonFileSaveFinal = async (data, files) => {
    // console.log(files);
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        fileName = '',
        filePath = '',
        img_upload = '',
        filePaths = [];
    var dir = 'assets/uploads',
        subdir = dir + '/lesson';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }
    return new Promise(async (resolve, reject) => {
        var table_name = 'td_lesson',
            fields = `(inc_id, reff_no, title, date, description, recom, created_by, created_at)`,
            values = `("${data.inc_id}","${data.reff_no}","${data.title}","${data.date}","${data.description}","${data.recom}","${data.user}","${datetime}")`,
            where = null,
            flag = 0;
        var inc_dt = await F_Insert(table_name, fields, values, where, flag)
        var lesson_id = inc_dt.suc > 0 ? (data.id > 0 ? data.id : inc_dt.lastId.insertId) : null
        // console.log(lesson_id);
        var res_dt = { suc: inc_dt.suc, msg: inc_dt.msg }

        var template = "assets/template/lesson.html"
        var upload_path = `assets/repository/${data.inc_no}/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`,
            file_path = `repository/${data.inc_no}/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`

        if (files && lesson_id) {
            if (Array.isArray(files)) {
                for (let file of files) {
                    fileName = file.name
                    filePath = 'uploads/lesson/' + fileName
                    filePaths.push({ path: server_url + filePath })
                    file.mv('assets/' + filePath, async (err) => {
                        if (err) {
                            console.log(`${fileName} not uploaded`);
                        } else {
                            console.log(`Successfully ${fileName} uploaded`);
                            fields = '(lesson_id, inc_id, file_name, file_path, created_by, created_at)'
                            values = `("${lesson_id}", "${data.inc_id}", "${fileName}", "${filePath}", "${data.user}", "${datetime}")`
                            table_name = 'td_lesson_file'
                            where = null
                            flag = 0
                            img_upload = await F_Insert(table_name, fields, values, where, flag)
                        }
                    })
                    if (img_upload.suc == 0) {
                        res_dt = { suc: 0, msg: `Error, While Uploading ${fileName}`, err: img_upload.msg }
                        break;
                    }
                }
                table_name = 'md_repository_category'
                select = `id, catg_name`
                where = `catg_name = "${data.inc_no}"`
                order = null
                dt = await F_Select(select, table_name, where, order);
                var repo_id = dt.suc > 0 ? dt.msg[0].id : null
                data['img'] = filePaths
                var pdf_dt = await MakePDF(template, upload_path, data, header = 'Lesson Learnt')

                if (pdf_dt.suc > 0) {
                    var ins_table_name = 'td_lesson';
                    fields = `final_flag = "Y", pdf_location = "${file_path}", final_by = "${data.user}", final_at = "${datetime}"`
                    values = null
                    ins_where = `id = ${lesson_id}`
                    flag = 1;
                    res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
                    ins_table_name = 'td_repository'
                    fields = '(catg_id, form_name, form_path, created_by, created_at)'
                    values = `("${repo_id}", "Lesson Learnt", "${file_path}", "${data.user}", "${datetime}")`
                    ins_where = null
                    flag = 0
                    var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
                } else {
                    res_dt = pdf_dt
                }
                resolve(res_dt)
            } else {
                fileName = files.name
                filePath = 'uploads/lesson/' + fileName
                files.mv('assets/' + filePath, async (err) => {
                    if (err) {
                        console.log(`${fileName} not uploaded`);
                    } else {
                        console.log(`Successfully ${fileName} uploaded`);
                        fields = '(lesson_id, inc_id, file_name, file_path, created_by, created_at)'
                        values = `("${lesson_id}", "${data.inc_id}", "${fileName}", "${filePath}", "${data.user}", "${datetime}")`
                        table_name = 'td_lesson_file'
                        where = null
                        flag = 0
                        img_upload = await F_Insert(table_name, fields, values, where, flag)
                        if (img_upload.suc == 0) {
                            res_dt = { suc: 0, msg: `Error, While Uploading ${fileName}`, err: img_upload.msg }
                        }
                    }
                })
                table_name = 'md_repository_category'
                select = `id, catg_name`
                where = `catg_name = "${data.inc_no}"`
                order = null
                dt = await F_Select(select, table_name, where, order);
                var repo_id = dt.suc > 0 ? dt.msg[0].id : null
                data['img'] = filePaths
                var pdf_dt = await MakePDF(template, upload_path, data, header = 'Lesson Learnt')

                if (pdf_dt.suc > 0) {
                    var ins_table_name = 'td_lesson';
                    fields = `final_flag = "Y", pdf_location = "${file_path}", final_by = "${data.user}", final_at = "${datetime}"`
                    values = null
                    ins_where = `id = ${lesson_id}`
                    flag = 1;
                    res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
                    ins_table_name = 'td_repository'
                    fields = '(catg_id, form_name, form_path, created_by, created_at)'
                    values = `("${repo_id}", "Lesson Learnt", "${file_path}", "${data.user}", "${datetime}")`
                    ins_where = null
                    flag = 0
                    var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
                } else {
                    res_dt = pdf_dt
                }
                resolve(res_dt)
            }
        } else {
            resolve(res_dt)
        }
    })
}


FormRouter.post('/lesson', async (req, res) => {
    var files = req.files ? (req.files.file ? req.files.file : null) : null
    var data = req.body
    var res_dt = await lesson_file_save(files, data)
    res.send(res_dt)
})

FormRouter.post('/lesson_final', async (req, res) => {
    var data = req.body,
        res_dt = ''
    if (data.id > 0) {
        res_dt = await SaveLessonFinal(data)
    } else {
        var files = req.files ? (req.files.file ? req.files.file : null) : null
        res_dt = await lessonFileSaveFinal(data, files)
    }
    res.send(res_dt)
})

FormRouter.post('/oil_spill_file', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
    var files = req.files ? (req.files.file ? req.files.file : null) : null,
        data = req.body;
    var dir = 'assets/repository',
        subdir = dir + '/' + data.inc_no,
        sub_subdir = subdir + '/oil_spill';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    } else if (!fs.existsSync(sub_subdir)) {
        fs.mkdirSync(sub_subdir);
    }

    if (files) {
        var fileName = data.inc_no + '_' + files.name.split(' ').join('_'),
            filePath = 'repository/' + data.inc_no + '/oil_spill/' + fileName
        files.mv('assets/' + filePath, async (err) => {
            if (err) {
                console.log(`${fileName} not uploaded`);
            } else {
                console.log(`Successfully ${fileName} uploaded`);

                table_name = 'md_repository_category'
                var select = `id, catg_name`
                where = `catg_name = "${data.inc_no}"`
                var order = null
                var dt = await F_Select(select, table_name, where, order);
                var repo_id = dt.suc > 0 ? dt.msg[0].id : null

                var table_name = 'td_repository',
                    fields = `(catg_id, form_name, form_path, created_by, created_at)`,
                    values = `("${repo_id}", "Oil Spill Modelling Form", "${filePath}", "${data.user}", "${datetime}")`,
                    where = null,
                    flag = 0;
                var r_dt = await F_Insert(table_name, fields, values, where, flag)

                table_name = 'td_oilspill_file'
                fields = '(inc_id, file_path, created_by, created_at)'
                values = `("${data.inc_id}", "${filePath}", "${data.user}", "${datetime}")`
                where = null
                flag = 0
                var res_dt = await F_Insert(table_name, fields, values, where, flag)
                res.send(res_dt)
                // await SectionImageSave(data, filename);
            }
        })
    }
})
//////////////////////////////////////////////////////////////////////////////////

/////////////////////////////// WEEKLY MEETING ///////////////////////////////////////
const meetingSave = (data, file_path) => {
    return new Promise(async (resolve, reject) => {
        var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"), res_dt;

        // IS FILE UPLOADED CHECK AND SET DB VALUES 
        var file_update = data.id > 0 ? (file_path ? `, file_path = "${file_path}"` : '') : (file_path ? `, "${file_path}"` : ''),
            file_field = file_path ? ', file_path' : ''

        // IS FINAL FLAG 'Y' CHECK AND SET DB VALUES 
        var final_fields = data.final_flag == 'Y' ? `, final_by, final_at` : '',
            final_val = data.id > 0 ? (data.final_flag == 'Y' ? `, final_flag = "${data.final_flag}", final_by = "${data.user}", final_at = "${datetime}"` : '') : (data.final_flag == 'Y' ? `, "${data.user}", "${datetime}"` : '');

        var table_name = `td_weekly_meeting`,
            fields = data.id > 0 ? `date = "${data.date}", ref_no = "${data.ref_no}", handover_date = "${data.handover_date}", handover_by = "${data.handover_by}", handover_to = "${data.handover_to}", attended_by = "${data.attended_by}", ongoing_act = "${data.ongoing_act}", upcoming_act = "${data.upcoming_act}", logistics = "${data.logistics}", shore_act = "${data.shore_act}", others = "${data.others}", modified_by = "${data.user}", modified_at = "${datetime}" ${file_update} ${final_val}` :
                `(inc_id, date, ref_no, handover_date, handover_by, handover_to, attended_by, ongoing_act, upcoming_act, logistics, shore_act, others, final_flag, created_by, created_at ${file_field} ${final_fields})`,
            values = `("${data.inc_id}", "${data.date}", "${data.ref_no}", "${data.handover_date}", "${data.handover_by}", "${data.handover_to}", "${data.attended_by}", "${data.ongoing_act}", "${data.upcoming_act}", "${data.logistics}", "${data.shore_act}", "${data.others}", "${data.final_flag}", "${data.user}", "${datetime}" ${file_update} ${final_val})`,
            whr = data.id > 0 ? `id = ${data.id} ` : null,
            flag = data.id > 0 ? 1 : 0,
            flag_type = flag > 0 ? 'UPDATED' : 'CREATED';
        res_dt = await F_Insert(table_name, fields, values, whr, flag);

        var user_id = data.user,
            act_type = flag > 0 ? 'M' : 'C',
            activity = `Weekly Meeting Board ${data.inc_name} IS ${flag_type} BY ${data.user} AT ${data.date}.`,
            activity_res = await CreateActivity(user_id, datetime, act_type, activity, data.inc_id);
        resolve(res_dt)
    })
}

FormRouter.post('/meeting', async (req, res) => {
    var data = req.body,
        files = req.files ? (req.files.file ? req.files.file : null) : null,
        file_path = null, res_dt;

    var dir = 'assets/uploads',
        subdir = dir + '/weekly_meeting';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }

    if (files) {
        var fileName = files.name.split(' ').join('_').split('-').join('_'),
            file_path = 'uploads/weekly_meeting/' + fileName

        files.mv('assets/' + file_path, async (err) => {
            if (err) {
                console.log(`${fileName} not uploaded`);
                res_dt = { suc: 0, msg: `${fileName} not uploaded` }
                res.send(res_dt)
            } else {
                console.log(`Successfully ${fileName} uploaded`);
                res_dt = await meetingSave(data, file_path)
                if (data.final_flag == 'Y') {
                    data.id = data.id > 0 ? data.id : res_dt.lastId.insertId
                    await MeetingPdfGen(data, file_path)
                }
                res.send(res_dt)
            }
        })
    } else {
        file_path = null
        res_dt = await meetingSave(data, file_path)
        if (data.final_flag == 'Y') {
            data.id = data.id > 0 ? data.id : res_dt.lastId.insertId
            await MeetingPdfGen(data, file_path)
        }
        res.send(res_dt)
    }
})

//////////////////////////////////////////////////////////////////////////////////

module.exports = { FormRouter, lesson_file_save };