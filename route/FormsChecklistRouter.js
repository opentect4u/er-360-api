const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
const fs = require('fs');
const upload = require('express-fileupload');
const { SaveLessonFinal, MakePDF, MeetingPdfGen, InvestigationPdfGen } = require('./AdditionalModuleRouter');

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

const LessonFileSave = async (files, data) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        fileName = '',
        filePath = '',
        img_upload = '',
        img_path = new Array;
    var dir = 'assets/uploads',
        subdir = dir + '/lesson';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }

    // IS FINAL FLAG 'Y' CHECK AND SET DB VALUES 
    var final_fields = data.final_flag == 'Y' ? `, final_by, final_at` : '',
        final_val = data.id > 0 ? (data.final_flag == 'Y' ? `, final_flag = "${data.final_flag}", final_by = "${data.user}", final_at = "${datetime}"` : '') : (data.final_flag == 'Y' ? `, "${data.user}", "${datetime}"` : '');

    var table_name = 'td_lesson',
        fields = data.id > 0 ? `inc_id = "${data.inc_id}", reff_no = "${data.reff_no}", title = "${data.title}", date = "${data.date}", description = "${data.description}", recom = "${data.recom}", modified_by = "${data.user}", modified_at = "${datetime}" ${final_val}` :
            `(inc_id, reff_no, title, date, description, recom, final_flag, created_by, created_at ${final_fields})`,
        values = `("${data.inc_id}","${data.reff_no}","${data.title}","${data.date}","${data.description}","${data.recom}","${data.final_flag}","${data.user}","${datetime}" ${final_val})`,
        where = data.id > 0 ? `id = ${data.id}` : null,
        flag = data.id > 0 ? 1 : 0;
    var inc_dt = await F_Insert(table_name, fields, values, where, flag)
    var lesson_id = inc_dt.suc > 0 ? (data.id > 0 ? data.id : inc_dt.lastId.insertId) : null

    var res_dt = { suc: inc_dt.suc, msg: inc_dt.msg }
    return new Promise(async (resolve, reject) => {
        // if (files && lesson_id) {
        if (Array.isArray(files)) {
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    fileName = files[i].name;
                    filePath = 'uploads/lesson/' + fileName;

                    // console.log('fileName', fileName, 'filePath', filePath);
                    files[i].mv('assets/' + filePath, (err) => {
                        console.log('file_' + i, files[i]);
                        if (err) {
                            console.log(`${fileName} not uploaded`);
                        } else {
                            console.log(`Successfully ${fileName} uploaded`);
                            img_path.push({ id: i, path: `"${server_url}${filePath}"` })
                            // console.log(`${server_url}${filePath}`);
                        }
                    })
                    fields = '(lesson_id, inc_id, file_name, file_path, created_by, created_at)'
                    values = `("${lesson_id}", "${data.inc_id}", "${fileName}", "${filePath}", "${data.user}", "${datetime}")`
                    table_name = 'td_lesson_file'
                    where = null
                    flag = 0
                    img_upload = await F_Insert(table_name, fields, values, where, flag)
                    // console.log('img_path', img_path);
                    if (img_upload.suc == 0) {
                        res_dt = { suc: 0, msg: `Error, While Uploading ${fileName}`, err: img_upload.msg }
                        break;
                    }
                }
            } else {
                img_path = data.file
            }
            if (data.final_flag == 'Y') {
                res_dt = await LessonPDFGenerate(data, img_path, lesson_id)
            }
            resolve(res_dt)
        } else {
            if (files) {
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
                        img_path.push({ id: 0, path: `${server_url}${filePath}` })
                    }
                })
            } else {
                img_path = data.file
            }
            if (data.final_flag == 'Y') {
                res_dt = await LessonPDFGenerate(data, img_path, lesson_id)
            }
            resolve(res_dt)
        }
        // } else {
        //     if (data.final_flag == 'Y') {

        //     } else {
        //         resolve(res_dt)
        //     }
        // }
    })
}

const LessonPDFGenerate = async (data, img_path, id) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        res_dt = '',
        catg_id = 17;

    var template = "assets/template/lesson.html"
    var upload_path = `assets/forms/lessen_learnt/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`,
        file_path = `forms/lessen_learnt/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`
    data.date = dateFormat(new Date(), "dd/mm/yyyy")
    data['img'] = img_path.length > 0 ? img_path : null

    return new Promise(async (resolve, reject) => {

        var pdf_dt = await MakePDF(template, upload_path, data, header = 'Lesson Learnt')
        if (pdf_dt.suc > 0) {
            var ins_table_name = 'td_lesson',
                fields = `pdf_location = "${file_path}"`,
                values = null,
                ins_where = `id = ${id}`,
                flag = 1;
            res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            ins_table_name = 'td_forms'
            fields = '(catg_id, form_name, form_path, created_by, created_at)'
            values = `("${catg_id}", "Lesson Learnt", "${file_path}", "${data.user}", "${datetime}")`
            ins_where = null
            flag = 0
            var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
        } else {
            res_dt = pdf_dt
        }
        resolve(res_dt)
    })
}

FormRouter.post('/lesson', async (req, res) => {
    var files = req.files ? (req.files.file ? req.files.file : null) : null
    var data = req.body
    // console.log(files);
    var res_dt = await LessonFileSave(files, data)
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

    var table_name, fields, values, where, flag, res_dt;

    var dir = 'assets/repository',
        subdir = dir + '/' + data.inc_no,
        sub_subdir = subdir + '/oil_spill';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    } else if (!fs.existsSync(sub_subdir)) {
        fs.mkdirSync(sub_subdir);
    }

    if (files) {
        table_name = 'md_repository_category'
        var select = `id, catg_name`
        where = `catg_name = "${data.inc_no}"`
        var order = null
        var dt = await F_Select(select, table_name, where, order);
        var repo_id = dt.suc > 0 ? dt.msg[0].id : null

        if (Array.isArray(files)) {
            for (let file of files) {
                let fileName = data.inc_no + '_' + file.name.split(' ').join('_')
                let filePath = 'repository/' + data.inc_no + '/oil_spill/' + fileName
                file.mv('assets/' + filePath, async (err) => {
                    if (err) {
                        console.log(`${fileName} not uploaded`);
                    } else {
                        console.log(`Successfully ${fileName} uploaded`);
                    }
                })

                table_name = 'td_repository'
                fields = `(catg_id, form_name, form_path, created_by, created_at)`
                values = `("${repo_id}", "Oil Spill Modelling Form ${file.name}", "${filePath}", "${data.user}", "${datetime}")`
                where = null
                flag = 0;
                let r_dt = await F_Insert(table_name, fields, values, where, flag)

                table_name = 'td_oilspill_file'
                fields = '(inc_id, file_path, created_by, created_at)'
                values = `("${data.inc_id}", "${filePath}", "${data.user}", "${datetime}")`
                where = null
                flag = 0
                res_dt = await F_Insert(table_name, fields, values, where, flag)
            }
        } else {
            var fileName = data.inc_no + '_' + files.name.split(' ').join('_'),
                filePath = 'repository/' + data.inc_no + '/oil_spill/' + fileName
            files.mv('assets/' + filePath, async (err) => {
                if (err) {
                    console.log(`${fileName} not uploaded`);
                } else {
                    console.log(`Successfully ${fileName} uploaded`);

                    table_name = 'td_repository'
                    fields = `(catg_id, form_name, form_path, created_by, created_at)`
                    values = `("${repo_id}", "Oil Spill Modelling Form", "${filePath}", "${data.user}", "${datetime}")`
                    where = null
                    flag = 0;
                    var r_dt = await F_Insert(table_name, fields, values, where, flag)

                    table_name = 'td_oilspill_file'
                    fields = '(inc_id, file_path, created_by, created_at)'
                    values = `("${data.inc_id}", "${filePath}", "${data.user}", "${datetime}")`
                    where = null
                    flag = 0
                    res_dt = await F_Insert(table_name, fields, values, where, flag)
                    // res.send(res_dt)
                    // await SectionImageSave(data, filename);
                }
            })
        }
    } else {
        res_dt = { suc: 0, msg: 'No file selected!!' }
    }
    res.send(res_dt)
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

/////////////////////////////// INVESTIGATION REPORT ///////////////////////////////////////
const SaveInvestigation = (data, file1, file2, file3) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        table_name, fields, values, whr, flag;
    var file1_field = file1 ? ((data.id > 0) ? `, file_1 = "${file1}"` : `, file_1`) : '',
        file2_field = file2 ? ((data.id > 0) ? `, file_2 = "${file2}"` : `, file_2`) : '',
        file3_field = file3 ? ((data.id > 0) ? `, file_3 = "${file3}"` : `, file_3`) : '',
        file1_val = file1 ? `, "${file1}"` : '',
        file2_val = file2 ? `, "${file2}"` : '',
        file3_val = file3 ? `, "${file3}"` : '';
    return new Promise(async (resolve, reject) => {
        table_name = 'td_investigation'
        fields = data.id > 0 ? `ref_no = "${data.ref_no}", inc_name = "${data.inc_name}", reported_by = "${data.reported_by}", 
        reported_on = "${data.reported_on}", approved_by = "${data.approved_by}", approved_on = "${data.approved_on}", 
        exec_summary = "${data.exec_summary}", inc_overview = "${data.inc_overview}", inv_method = "${data.inv_method}", 
        facility_info = "${data.facility_info}", other_fact = "${data.other_fact}", inc_desc = "${data.inc_desc}", 
        inc_dtls = "${data.inc_dtls}", injured_person_dtls = "${data.injured_person_dtls}", seq_of_inv = "${data.seq_of_inv}", 
        inc_impact = "${data.inc_impact}", inc_inv_res = "${data.inc_inv_res}", analysis_of_findings = "${data.analysis_of_findings}", 
        conclusion = "${data.conclusion}", recommendation = "${data.recommendation}", file1_dtls = "${data.file1_dtls}", 
        file2_dtls = "${data.file2_dtls}", file3_dtls = "${data.file3_dtls}", final_flag = "${data.final_flag}", modified_by = "${data.user}", modified_at = "${datetime}" ${file1_field}  ${file2_field}  ${file3_field}` :
            `(ref_no, inc_name, reported_by, reported_on, approved_by, approved_on, exec_summary, inc_overview, inv_method, facility_info, other_fact, inc_desc, inc_dtls, injured_person_dtls, seq_of_inv, inc_impact, inc_inv_res, analysis_of_findings, conclusion, recommendation, file1_dtls, file2_dtls, file3_dtls, final_flag, created_by, created_at  ${file1_field}  ${file2_field}  ${file3_field})`
        values = `("${data.ref_no}", "${data.inc_name}", "${data.reported_by}", "${data.reported_on}", "${data.approved_by}", 
        "${data.approved_on}", "${data.exec_summary}", "${data.inc_overview}", "${data.inv_method}", "${data.facility_info}", 
        "${data.other_fact}", "${data.inc_desc}", "${data.inc_dtls}", "${data.injured_person_dtls}", "${data.seq_of_inv}", 
        "${data.inc_impact}", "${data.inc_inv_res}", "${data.analysis_of_findings}", "${data.conclusion}", "${data.recommendation}", 
        "${data.file1_dtls}", "${data.file2_dtls}", "${data.file3_dtls}", "${data.final_flag}", "${data.user}", "${datetime}" ${file1_val} ${file2_val} ${file3_val})`
        whr = data.id > 0 ? `id = ${data.id}` : null
        flag = data.id > 0 ? 1 : 0
        flag_type = flag > 0 ? 'UPDATED' : 'CREATED';
        var res_dt = await F_Insert(table_name, fields, values, whr, flag)
        var investigation_id = data.id > 0 ? data.id : res_dt.lastId.insertId
        var row_id = data.id > 0 ? data.id : td_investigation

        if (Array.isArray(JSON.parse(data.team_members)) && res_dt.suc > 0) {
            for (let dt of JSON.parse(data.team_members)) {
                table_name = 'td_investigation_team'
                fields = dt.id > 0 ? `ref_no = "${data.ref_no}", name = "${dt.name}", designation = "${dt.designation}", inv_team_designation = "${dt.inv_team_designation}", modified_by = "${data.user}", modified_at = "${datetime}"` :
                    '(ref_no, investi_id, name, designation, inv_team_designation, created_by, created_at)'
                values = `("${data.ref_no}", "${investigation_id}", "${dt.name}", "${dt.designation}", "${dt.inv_team_designation}", "${data.user}", "${datetime}")`
                whr = dt.id > 0 ? `id = ${dt.id}` : null
                flag = dt.id > 0 ? 1 : 0
                res_dt = await F_Insert(table_name, fields, values, whr, flag)
                if (res_dt.suc == 0) {
                    res_dt = { suc: 0, msg: res_dt.msg }
                    break;
                }
            }
        }
        if (data.final_flag == 'Y') {
            await InvestigationPdfGen(data, file1, file2, file3, row_id)
        }
        resolve(res_dt)
    })

}
FormRouter.post('/investigation', async (req, res) => {
    var data = req.body,
        file1 = req.files ? (req.files.file1 ? req.files.file1 : null) : null,
        file2 = req.files ? (req.files.file2 ? req.files.file2 : null) : null,
        file3 = req.files ? (req.files.file3 ? req.files.file3 : null) : null,
        file1_path = null,
        file2_path = null,
        file3_path = null, res_dt, file1Name, file2Name, file3Name;

    if (file1) {
        file1Name = file1.name.split(' ').join('_').split('-').join('_')
        file1_path = 'uploads/investigation_report/' + file1Name
    }

    if (file2) {
        file2Name = file2.name.split(' ').join('_').split('-').join('_')
        file2_path = 'uploads/investigation_report/' + file2Name
    }

    if (file3) {
        file3Name = file3.name.split(' ').join('_').split('-').join('_')
        file3_path = 'uploads/investigation_report/' + file3Name
    }


    var dir = 'assets/uploads',
        subdir = dir + '/investigation_report';
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }

    if (file1) {
        file1.mv('assets/' + file1_path, async (err) => {
            if (err) {
                console.log(`${file1Name} not uploaded`);
                res_dt = { suc: 0, msg: `${file1Name} not uploaded` }
                res.send(res_dt)
            } else {
                console.log(`Successfully ${file1Name} uploaded`);
            }
        })
    }

    if (file2) {
        file2.mv('assets/' + file2_path, async (err) => {
            if (err) {
                console.log(`${file2Name} not uploaded`);
                res_dt = { suc: 0, msg: `${file2Name} not uploaded` }
                res.send(res_dt)
            } else {
                console.log(`Successfully ${file2Name} uploaded`);
            }
        })
    }

    if (file3) {
        file3.mv('assets/' + file3_path, async (err) => {
            if (err) {
                console.log(`${file3Name} not uploaded`);
                res_dt = { suc: 0, msg: `${file3Name} not uploaded` }
                res.send(res_dt)
            } else {
                console.log(`Successfully ${file3Name} uploaded`);
            }
        })
    }

    res_dt = await SaveInvestigation(data, file1_path, file2_path, file3_path);
    res.send(res_dt);
})

FormRouter.get('/investigation', async (req, res) => {
    var id = req.query.id
    var select = `id, ref_no, inc_name, reported_by, reported_on, approved_by, approved_on, exec_summary, inc_overview, inv_method, facility_info, other_fact, inc_desc, inc_dtls, injured_person_dtls, seq_of_inv, inc_impact, inc_inv_res, analysis_of_findings, conclusion, recommendation, file_1, file1_dtls, file_2, file2_dtls, file_3, file3_dtls, pdf_location, final_flag`,
        table_name = `td_investigation`,
        whr = id > 0 ? `id = ${id}` : null,
        order = null;
    var res_dt = await F_Select(select, table_name, whr, order);

    if (id > 0) {
        select = `id, ref_no, investi_id, name, designation, inv_team_designation`
        table_name = `td_investigation_team`
        whr = `investi_id = ${id}`
        order = null;
        var dt = await F_Select(select, table_name, whr, order);
        if (dt.suc > 0) {
            res_dt.msg[0]['team_members'] = dt.msg
            // console.log(res_dt);
            res.send(res_dt)
        } else {
            res_dt.msg[0]['team_members'] = null
            res.send(res_dt)
        }
    } else {
        res.send(res_dt)
    }

})

FormRouter.get('/investigation_del', async (req, res) => {
    var flag = req.query.flag,
        id = req.query.id, table_name, whr, res_dt;
    switch (flag) {
        case '1':
            table_name = `td_investigation`
            whr = `id = ${id}`
            res_dt = await F_Delete(table_name, whr)
            table_name = `td_investigation_team`
            whr = `investi_id = ${id}`
            res_dt = await F_Delete(table_name, whr)
            break;
        case '2':
            table_name = `td_investigation_team`
            whr = `id = ${id}`
            res_dt = await F_Delete(table_name, whr)
            break;

        default:
            break;
    }
    res.send(res_dt)
})
//////////////////////////////////////////////////////////////////////////////////

module.exports = { FormRouter, lesson_file_save };