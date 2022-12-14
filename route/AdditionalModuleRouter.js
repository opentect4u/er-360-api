const express = require('express');
const { F_Insert, F_Select, CreateActivity, F_Delete } = require('../modules/MasterModule');
const dateFormat = require('dateformat');
var pdf = require("pdf-creator-node");
const fs = require('fs');

// var server_url = 'http://localhost:3000/'
var server_url = 'https://api.er-360.com/'

const AddModrouter = express.Router();

// GENERATE PDF //
const MakePDF = async (template, upload_path, file_data, header) => {
    // READ HTML TEMPLATE FROM GIVEN PATH //
    var html = fs.readFileSync(template, "utf8");

    // SET PDF OPTIONS //
    // var options = {
    //     format: "A4",
    //     orientation: "portrait",
    //     border: "10mm",
    //     header: {
    //         height: "20mm",
    //         contents: `<div style="text-align: center;">${header}</div>`
    //     }
    // };
    var options = {
        format: "A4",
        orientation: "portrait",
        dpi: 200,
        quality: 80,
        border: "5mm",
    }

    // EMBEDD DATA INTO HTML TEMPLATE //
    var document = {
        html: html,
        data: file_data,
        path: upload_path,
        type: "",
    };

    // GENERATE PDF AND RETURN RESPONSE //
    return new Promise((resolve, reject) => {
        var res_dt = ''
        pdf
            .create(document, options)
            .then((res) => {
                console.log(res);
                res_dt = { suc: 1, msg: 'File Uploaded', res: res }
                resolve(res_dt)
            })
            .catch((error) => {
                res_dt = { suc: 0, msg: 'File Not Uploaded', res: error }
                console.error(error);
                resolve(res_dt)
            });
    })
}
// END //

AddModrouter.get('/lalala', async (req, res) => {
    // var html = fs.readFileSync('assets/Form.pdf', "utf8");
    // console.log(html);

    // const PDFDocument = require('pdfkit');
    // const doc = new PDFDocument;

    // doc.pipe(fs.createWriteStream('/path/to/file.pdf')); // write to PDF
    // doc.pipe(res);                                       // HTTP response

    // // add stuff to PDF here using methods described below...

    // // finalize the PDF and end the stream
    // doc.end();
})

// FETCH LESSON LEARNT DATA //
AddModrouter.get('/lesson', async (req, res) => {
    var id = req.query.id,
        inc_id = req.query.inc_id,
        dt = '',
        select, table_name, where, order;
    if (id > 0) {
        table_name = 'td_lesson a LEFT JOIN td_lesson_file b ON a.id=b.lesson_id AND a.inc_id=b.inc_id'
        select = `a.id, a.inc_id, a.reff_no, a.title, a.date, a.description, a.recom, a.final_flag, a.pdf_location, IF((SELECT COUNT(c.id) FROM td_lesson_file c WHERE a.id=c.lesson_id AND a.inc_id=c.inc_id) > 0, 1, 0) isFile, b.file_name, b.file_path, b.id as file_id`
        where = inc_id > 0 ? `a.inc_id = ${inc_id}` : (id > 0 ? `a.id = ${id}` : '')
        order = null;
        dt = await F_Select(select, table_name, where, order)
    } else {
        table_name = 'td_lesson a'
        select = `a.id, a.inc_id, a.reff_no, a.title, a.date, a.description, a.recom, a.final_flag, a.pdf_location`
        where = inc_id > 0 ? `a.inc_id = ${inc_id}` : (id > 0 ? `a.id = ${id}` : '')
        order = null
        dt = await F_Select(select, table_name, where, order)
    }
    res.send(dt)
})
// END //

const SaveLessonFinal = async (data) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
    var table_name = 'md_repository_category',
        select = `id, catg_name`,
        where = `catg_name = "${data.inc_no}"`,
        order = null,
        dt = await F_Select(select, table_name, where, order);
    var repo_id = dt.suc > 0 ? dt.msg[0].id : null
    var res_dt = ''
    return new Promise(async (resolve, reject) => {
        if (repo_id > 0) {
            var template = "assets/template/lesson.html"
            var upload_path = `assets/repository/${data.inc_no}/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`,
                file_path = `repository/${data.inc_no}/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`
            table_name = 'td_lesson a'
            select = `a.id, a.reff_no, a.title, date_format(a.date, '%d/%m/%Y') date, a.description, a.recom, IF((SELECT COUNT(c.id) FROM td_lesson_file c WHERE a.id=c.lesson_id AND a.inc_id=c.inc_id) > 0, 1, 0) isFile`
            where = `a.id = "${data.id}"`
            order = null
            var file_data = await F_Select(select, table_name, where, order);
            file_data = file_data.suc > 0 ? file_data.msg[0] : null
            if (file_data.isFile > 0) {
                table_name = 'td_lesson_file'
                select = `id, CONCAT("${server_url}", file_path) path`
                where = `lesson_id = "${data.id}"`
                order = null
                var img_data = await F_Select(select, table_name, where, order);
                file_data['img'] = img_data.suc > 0 ? img_data.msg : null
            } else {
                file_data['img'] = null
            }
            var pdf_dt = await MakePDF(template, upload_path, file_data, header = 'Lesson Learnt')
            if (pdf_dt.suc > 0) {
                var ins_table_name = 'td_lesson',
                    fields = `final_flag = "Y", pdf_location = "${file_path}", modified_by = "${data.user}", modified_at = "${datetime}", final_by = "${data.user}", final_at = "${datetime}"`,
                    values = null,
                    ins_where = `id = ${data.id}`,
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
            res_dt = { suc: 0, msg: 'Repository Not Found!!', err: dt.msg }
            resolve(res_dt)
        }
    })
}

AddModrouter.get('/lesson_file_del', async (req, res) => {
    var id = req.query.id,
        table_name = 'td_lesson_file',
        whr = `id = ${id}`;
    var res_dt = await F_Delete(table_name, whr)
    res.send(res_dt)
})

// AddModrouter.post('/lesson_final1', async (req, res) => {
//     var data = req.body
//     var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
//     var table_name = 'md_repository_category',
//         select = `id, catg_name`,
//         where = `catg_name = "${data.inc_no}"`,
//         order = null,
//         dt = await F_Select(select, table_name, where, order);
//     var repo_id = dt.suc > 0 ? dt.msg[0].id : null
//     var res_dt = ''
//     if (repo_id > 0) {
//         var template = "assets/template/lesson.html"
//         var upload_path = `assets/repository/${data.inc_no}/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`,
//             file_path = `repository/${data.inc_no}/lesson_learnt_${data.inc_id}_${data.reff_no.split('/').join('-').split(' ').join('-')}.pdf`
//         table_name = 'td_lesson a'
//         select = `a.id, a.reff_no, a.title, date_format(a.date, '%d/%m/%Y') date, a.description, a.recom, IF((SELECT COUNT(c.id) FROM td_lesson_file c WHERE a.id=c.lesson_id AND a.inc_id=c.inc_id) > 0, 1, 0) isFile`
//         where = `a.id = "${data.id}"`
//         order = null
//         var file_data = await F_Select(select, table_name, where, order);
//         file_data = file_data.suc > 0 ? file_data.msg[0] : null
//         if (file_data.isFile > 0) {
//             table_name = 'td_lesson_file'
//             select = `id, CONCAT("${server_url}", file_path) path`
//             where = `lesson_id = "${data.id}"`
//             order = null
//             var img_data = await F_Select(select, table_name, where, order);
//             file_data['img'] = img_data.suc > 0 ? img_data.msg : null
//         } else {
//             file_data['img'] = null
//         }
//         var pdf_dt = await MakePDF(template, upload_path, file_data, header = 'Lesson Learnt')
//         if (pdf_dt.suc > 0) {
//             var ins_table_name = 'td_lesson',
//                 fields = `final_flag = "Y", pdf_location = "${file_path}", modified_by = "${data.user}", modified_at = "${datetime}", final_by = "${data.user}", final_at = "${datetime}"`,
//                 values = null,
//                 ins_where = `id = ${data.id}`,
//                 flag = 1;
//             res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
//             ins_table_name = 'td_repository'
//             fields = '(catg_id, form_name, form_path, created_by, created_at)'
//             values = `("${repo_id}", "Lesson Learnt", "${file_path}", "${data.user}", "${datetime}")`
//             ins_where = null
//             flag = 0
//             var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
//         } else {
//             res_dt = pdf_dt
//         }
//     } else {

//     }
//     res.send(res_dt)
// })

// MEDIA RELEASE //
// FETCH MEDIA RELEASE DATA //
AddModrouter.get('/media_rel', async (req, res) => {
    var id = req.query.id,
        inc_id = req.query.inc_id,
        table_name = 'td_media_release',
        select = `id, inc_id, rel_no, date, time, location, description, contact_name, contact_info, final_flag, pdf_location`,
        where = id > 0 ? `id = ${id}` : (inc_id > 0 ? `inc_id = ${inc_id}` : '')
    order = null;
    var dt = await F_Select(select, table_name, where, order);
    res.send(dt)
})
// END //

// MEDIA RELEASE SAVE //
AddModrouter.post('/media_rel', async (req, res) => {
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
// END //

// MEDIA RELEASE FINAL SAVE //
AddModrouter.post('/media_rel_final', async (req, res) => {
    var data = req.body
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
    var table_name = 'md_repository_category',
        select = `id, catg_name`,
        where = `catg_name = "${data.inc_no}"`,
        order = null,
        dt = await F_Select(select, table_name, where, order);
    var repo_id = dt.suc > 0 ? dt.msg[0].id : null
    var res_dt = ''
    if (repo_id > 0) {
        var template = "assets/template/media_release.html"
        var upload_path = `assets/repository/${data.inc_no}/media_release_${data.inc_id}_${data.rel_no.split('/').join('-').split(' ').join('-')}.pdf`,
            file_path = `repository/${data.inc_no}/media_release_${data.inc_id}_${data.rel_no.split('/').join('-').split(' ').join('-')}.pdf`

        if (data.id > 0) {
            var file_data = data

            var pdf_dt = await MakePDF(template, upload_path, file_data, header = 'Media Release')
            if (pdf_dt.suc > 0) {
                var ins_table_name = 'td_media_release',
                    fields = `final_flag = "Y", pdf_location = "${file_path}", modified_by = "${data.user}", modified_at = "${datetime}", final_by = "${data.user}", final_at = "${datetime}"`,
                    values = null,
                    ins_where = `id = ${data.id}`,
                    flag = 1;
                res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
                ins_table_name = 'td_repository'
                fields = '(catg_id, form_name, form_path, created_by, created_at)'
                values = `("${repo_id}", "Media Release", "${file_path}", "${data.user}", "${datetime}")`
                ins_where = null
                flag = 0
                var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            } else {
                res_dt = pdf_dt
            }
        } else {
            var pdf_dt = await MakePDF(template, upload_path, data, header = 'Media Release')

            var table_name = 'td_media_release',
                fields = '(inc_id, rel_no, date, time, location, description, contact_name, contact_info, final_flag, pdf_location, created_by, created_at, final_by, final_at)',
                values = `("${data.inc_id}", "${data.rel_no}", "${data.date}", "${data.time}", "${data.location}", "${data.description}", "${data.contact_name}", "${data.contact_info}", "Y", "${file_path}", "${data.user}", "${datetime}", "${data.user}", "${datetime}")`,
                whr = null,
                flag = 0,
                flag_type = 'INSERTED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Media release form is ${flag_type} by ${data.contact_name}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

            res_dt = await F_Insert(table_name, fields, values, whr, flag);

            table_name = 'td_repository'
            fields = '(catg_id, form_name, form_path, created_by, created_at)'
            values = `("${repo_id}", "Media Release", "${file_path}", "${data.user}", "${datetime}")`
            ins_where = null
            flag = 0
            var r_dt = await F_Insert(table_name, fields, values, ins_where, flag)
        }
    }
    res.send(res_dt)
})
// END //

// HOLDING STATEMENT //
// FETCH HOLDING STATEMENT DATA //
AddModrouter.get('/holding', async (req, res) => {
    var id = req.query.id,
        inc_id = req.query.inc_id,
        table_name = 'td_holding',
        select = `id, inc_id, sta_no, date, time, wishers_name, issued_by, issued_date, contact_info, contact_person, location, description, final_flag, pdf_location`,
        where = id > 0 ? `id = ${id}` : (inc_id > 0 ? `inc_id = ${inc_id}` : '')
    order = null;
    var dt = await F_Select(select, table_name, where, order);
    res.send(dt)
})
// END //

// HOLDING STATEMENT SAVE //
AddModrouter.post('/holding', async (req, res) => {
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss");
    var data = req.body;
    var table_name = 'td_holding',
        fields = data.id > 0 ? `inc_id = "${data.inc_id}", sta_no = "${data.sta_no}", date = "${data.date}", time = "${data.time}", wishers_name = "${data.wishers_name}", issued_by = "${data.issued_by}", issued_date = "${data.issued_date}", contact_info = "${data.contact_info}", contact_person = "${data.contact_person}", location = "${data.location}", description = "${data.description}", modified_by = "${data.user}", modified_at = "${datetime}"` :
            '(inc_id, sta_no, date, time, wishers_name, issued_by, issued_date, contact_info, contact_person, location, description, created_by, created_at)',
        values = `("${data.inc_id}", "${data.sta_no}", "${data.date}", "${data.time}", "${data.wishers_name}", "${data.issued_by}", "${data.issued_date}", "${data.contact_info}", "${data.contact_person}", "${data.location}", "${data.description}", "${data.user}", "${datetime}")`,
        whr = `id = ${data.id}`,
        flag = data.id > 0 ? 1 : 0,
        flag_type = flag > 0 ? 'UPDATED' : 'INSERTED';

    var user_id = data.user,
        act_type = flag > 0 ? 'M' : 'C',
        activity = `Holding Statement form is ${flag_type} by ${data.contact_name}`;
    var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

    var dt = await F_Insert(table_name, fields, values, whr, flag);
    res.send(dt)
})
// END //

// HOLDING STATEMENT FINAL SAVE //
AddModrouter.post('/holding_final', async (req, res) => {
    var data = req.body
    var datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss")
    var table_name = 'md_repository_category',
        select = `id, catg_name`,
        where = `catg_name = "${data.inc_no}"`,
        order = null,
        dt = await F_Select(select, table_name, where, order);
    var repo_id = dt.suc > 0 ? dt.msg[0].id : null
    var res_dt = ''
    if (repo_id > 0) {
        var template = "assets/template/holding.html"
        var upload_path = `assets/repository/${data.inc_no}/holding_${data.inc_id}_${data.sta_no.split('/').join('-').split(' ').join('-')}.pdf`,
            file_path = `repository/${data.inc_no}/holding_${data.inc_id}_${data.sta_no.split('/').join('-').split(' ').join('-')}.pdf`

        if (data.id > 0) {
            table_name = 'td_holding a, td_incident b, md_location c'
            select = `a.sta_no, DATE_FORMAT(a.date, '%d/%m/%Y') date, DATE_FORMAT(a.time, '%H:%i') time, a.wishers_name, b.inc_name, DATE_FORMAT(b.inc_dt, '%d/%m/%Y') inc_date, DATE_FORMAT(b.inc_dt, '%H:%i') inc_time, c.offshore_name inc_location, c.offshore_latt latt, c.offshore_long longi, a.description, a.contact_person, a.issued_by, a.contact_info, DATE_FORMAT(a.issued_date, '%d/%m/%Y') issued_date`
            where = `a.inc_id = b.id AND b.inc_location_id=c.id AND a.id = "${data.id}"`
            order = null
            var file_data = await F_Select(select, table_name, where, order);
            file_data = file_data.suc > 0 ? file_data.msg[0] : null

            var pdf_dt = await MakePDF(template, upload_path, file_data, header = 'Holding Statement')
            if (pdf_dt.suc > 0) {
                var ins_table_name = 'td_holding',
                    fields = `final_flag = "Y", pdf_location = "${file_path}", modified_by = "${data.user}", modified_at = "${datetime}", final_by = "${data.user}", final_at = "${datetime}"`,
                    values = null,
                    ins_where = `id = ${data.id}`,
                    flag = 1;
                res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
                ins_table_name = 'td_repository'
                fields = '(catg_id, form_name, form_path, created_by, created_at)'
                values = `("${repo_id}", "Holding Statement", "${file_path}", "${data.user}", "${datetime}")`
                ins_where = null
                flag = 0
                var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            } else {
                res_dt = pdf_dt
            }
        } else {
            table_name = 'td_incident a, md_location b'
            select = `a.inc_name, DATE_FORMAT(a.inc_dt, '%d/%m/%Y') inc_date, DATE_FORMAT(a.inc_dt, '%H:%i') inc_time, b.offshore_name inc_location, b.offshore_latt latt, b.offshore_long longi`
            where = `a.inc_location_id=b.id AND a.id = "${data.inc_id}"`
            order = null
            var inc_data = await F_Select(select, table_name, where, order);
            data['inc_name'] = inc_data.msg[0].inc_name
            data['inc_date'] = inc_data.msg[0].inc_date
            data['inc_time'] = inc_data.msg[0].inc_time
            data['inc_location'] = inc_data.msg[0].inc_location

            var pdf_dt = await MakePDF(template, upload_path, data, header = 'Media Release')

            var table_name = 'td_holding',
                fields = '(inc_id, sta_no, date, time, wishers_name, issued_by, issued_date, contact_info, contact_person, location, description, final_flag, pdf_location, created_by, created_at, final_by, final_at)',
                values = `("${data.inc_id}", "${data.sta_no}", "${data.date}", "${data.time}", "${data.wishers_name}", "${data.issued_by}", "${data.issued_date}", "${data.contact_info}", "${data.contact_person}", "${data.location}", "${data.description}", "Y", "${file_path}", "${data.user}", "${datetime}", "${data.user}", "${datetime}")`,
                whr = null,
                flag = 0,
                flag_type = 'INSERTED';

            var user_id = data.user,
                act_type = flag > 0 ? 'M' : 'C',
                activity = `Holding Statement form is ${flag_type} by ${data.contact_name}`;
            var activity_res = await CreateActivity(user_id, datetime, act_type, activity);

            res_dt = await F_Insert(table_name, fields, values, whr, flag);

            table_name = 'td_repository'
            fields = '(catg_id, form_name, form_path, created_by, created_at)'
            values = `("${repo_id}", "Holding Statement", "${file_path}", "${data.user}", "${datetime}")`
            ins_where = null
            flag = 0
            var r_dt = await F_Insert(table_name, fields, values, ins_where, flag)
        }
    }
    res.send(res_dt)
})
// END //

// WEEKLY MEETING PDF GENERATION //
const MeetingPdfGen = async (data, file_path) => {
    var table_name, select, whr, order, res_dt;
    var date = dateFormat(new Date(), "yyyy_mm_dd"),
        datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        catg_id = 14;
    table_name = 'md_teams'
    select = `id, team_name`
    var team_dt = await F_Select(select, table_name, null, null)
    var handover_by = team_dt.msg.find(e => e.id == data.handover_by).team_name
    var handover_to = team_dt.msg.find(e => e.id == data.handover_to).team_name

    data.handover_by = handover_by
    data.handover_to = handover_to
    data.date = dateFormat(data.date, "dd/mm/yyyy H:MM TT")
    data.handover_date = dateFormat(data.handover_date, "dd/mm/yyyy H:MM TT")
    data['img'] = file_path ? server_url + file_path : (data.file ? data.file : null)

    // console.log(data);

    var template = "assets/template/meeting.html"
    var upload_path = `assets/forms/meeting/meeting_${date}_${data.ref_no.split('/').join('-').split(' ').join('-')}.pdf`,
        pdf_path = `forms/meeting/meeting_${date}_${data.ref_no.split('/').join('-').split(' ').join('-')}.pdf`;

    var pdf_dt = await MakePDF(template, upload_path, data, header = 'Weekly Meeting')

    return new Promise(async (resolve, reject) => {
        if (pdf_dt.suc > 0) {
            var ins_table_name = 'td_weekly_meeting',
                fields = `pdf_location = "${pdf_path}", modified_by = "${data.user}", modified_at = "${datetime}"`,
                values = null,
                ins_where = `id = ${data.id}`,
                flag = 1;
            res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            ins_table_name = 'td_forms'
            fields = '(catg_id, form_type, form_name, form_path, created_by, created_at)'
            values = `("${catg_id}", "F", "${data.date} ${data.ref_no}", "${pdf_path}", "${data.user}", "${datetime}")`
            ins_where = null
            flag = 0
            var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            resolve(res_dt)
        } else {
            res_dt = pdf_dt
            resolve(res_dt)
        }
    })
}
// END //

// INCIDENT INVESTIGATION REPORT PDF GENERATION //
const InvestigationPdfGen = async (data, file1, file2, file3, row_id) => {
    var table_name, select, whr, order, res_dt;
    var date = dateFormat(new Date(), "yyyy_mm_dd"),
        datetime = dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
        catg_id = 15;

    data.reported_on = dateFormat(data.reported_on, "dd/mm/yyyy")
    data.approved_on = dateFormat(data.approved_on, "dd/mm/yyyy")
    data.file1 = file1 ? server_url + file1 : (data.file1 ? data.file1 : null)
    data.file2 = file2 ? server_url + file2 : (data.file1 ? data.file2 : null)
    data.file3 = file3 ? server_url + file3 : (data.file1 ? data.file3 : null)
    data.id = row_id
    data.team_members = JSON.parse(data.team_members)
    // data['img'] = file_path ? server_url + file_path : (data.file ? data.file : null)

    // console.log(data);

    var template = "assets/template/investigation.html"
    var upload_path = `assets/forms/incident_investigation_report/inv_${date}_${data.ref_no.split('/').join('-').split(' ').join('-')}.pdf`,
        pdf_path = `forms/incident_investigation_report/inv_${date}_${data.ref_no.split('/').join('-').split(' ').join('-')}.pdf`;

    var pdf_dt = await MakePDF(template, upload_path, data, header = 'Incident Investigation Report')

    return new Promise(async (resolve, reject) => {
        if (pdf_dt.suc > 0) {
            var ins_table_name = 'td_investigation',
                fields = `pdf_location = "${pdf_path}", modified_by = "${data.user}", modified_at = "${datetime}"`,
                values = null,
                ins_where = `id = ${data.id}`,
                flag = 1;
            res_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            ins_table_name = 'td_forms'
            fields = '(catg_id, form_type, form_name, form_path, created_by, created_at)'
            values = `("${catg_id}", "F", "${data.inc_name}-Incident Investigation Report", "${pdf_path}", "${data.user}", "${datetime}")`
            ins_where = null
            flag = 0
            var r_dt = await F_Insert(ins_table_name, fields, values, ins_where, flag)
            resolve(res_dt)
        } else {
            res_dt = pdf_dt
            resolve(res_dt)
        }
    })
}
// END //

// COMCEN NOTIFICATION //
AddModrouter.get('/comcen_notification', async (req, res) => {
    var data = require('../assets/uploads/test.json'),
        datetime = dateFormat(new Date(), "ddmmyyyyHHMM"),
        inc_datetime = dateFormat(data.datetime, "yyyy-mm-dd HH:MM"),
        select, table_name, whr, order, fields, values, flag, res_dt, dt, catgres_dt;

    var dir = 'assets/uploads/comcen_notification_data',
        subdir = dir + '/' + data.inc_id;
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }

    var jsonContent = JSON.stringify(data);
    var json_file_path = `assets/uploads/comcen_notification_data/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.json`,
        json_path = `uploads/comcen_notification_data/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.json`;

    fs.writeFile(json_file_path, jsonContent, 'utf8', async (err) => {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        } else {
            var template = "assets/template/comcen_notification.html"
            var upload_path = `assets/repository/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.pdf`,
                pdf_path = `repository/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.pdf`;
            var pdf_dt = await MakePDF(template, upload_path, data, header = 'Comcen Notification')

            table_name = 'md_repository_category'
            select = 'id, catg_name'
            whr = `catg_name="${data.inc_id}"`
            order = null;
            dt = await F_Select(select, table_name, whr, order);
            var repo_catg_id = 0;
            if (dt.msg.length > 0 && dt.suc > 0) {
                repo_catg_id = dt.msg[0].id;

                table_name = 'td_repository'
                fields = '(catg_id, form_name, form_path, created_by, created_at)'
                values = `("${dt.msg[0].id}", "Comcen Notification ${datetime} ${data.seq_no}", "${pdf_path}", "${data.user}", "${inc_datetime}")`
                flag = 0;
                res_dt = await F_Insert(table_name, fields, values, null, flag)
            } else {
                table_name = 'md_repository_category'
                fields = '(catg_name, created_by, created_at)'
                values = `("${data.inc_id}", "${data.user}", "${inc_datetime}")`
                flag = 0;
                catgres_dt = await F_Insert(table_name, fields, values, null, flag)

                repo_catg_id = catgres_dt.lastId.insertId;

                table_name = 'td_repository'
                fields = '(catg_id, form_name, form_path, created_by, created_at)'
                values = `("${catgres_dt.lastId.insertId}", "Comcen Notification ${datetime} ${data.seq_no}", "${pdf_path}", "${data.user}", "${inc_datetime}")`
                flag = 0;
                res_dt = await F_Insert(table_name, fields, values, null, flag)
            }

            table_name = 'td_comcen_notification'
            fields = '(inc_no, repo_catg_id, noti_dt, json_path, pdf_path, created_by, created_dt)'
            values = `("${data.inc_id}", "${repo_catg_id}", "${data.datetime}", "${json_path}", "${pdf_path}", "${data.user}", "${inc_datetime}")`
            res_dt = await F_Insert(table_name, fields, values, null, 0);
            res.send(res_dt);
        }
        // console.log("JSON file has been saved.");
    });

    // console.log(pdf_path);
    // res.send(res_dt);
})

AddModrouter.post('/comcen_notification', async (req, res) => {
    var data = req.body,
        datetime = dateFormat(data.datetime, "ddmmyyyyHHMM"),
        inc_datetime = dateFormat(data.datetime, "yyyy-mm-dd HH:MM"),
        select, table_name, whr, order, fields, values, flag, res_dt, dt, catgres_dt;

    var dir = 'assets/uploads/comcen_notification_data',
        subdir = dir + '/' + data.inc_id;
    if (!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir);
    }

    var jsonContent = JSON.stringify(data);
    var json_file_path = `assets/uploads/comcen_notification_data/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.json`,
        json_path = `uploads/comcen_notification_data/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.json`;

    fs.writeFile(json_file_path, jsonContent, 'utf8', async (err) => {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        } else {
            console.log('JSON File Create: ', 'File uploaded');
            var template = "assets/template/comcen_notification.html"
            var upload_path = `assets/repository/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.pdf`,
                pdf_path = `repository/${data.inc_id}/${data.inc_id}_${datetime}_${data.seq_no}.pdf`;
            var pdf_dt = await MakePDF(template, upload_path, data, header = 'Comcen Notification')

            table_name = 'md_repository_category'
            select = 'id, catg_name'
            whr = `catg_name="${data.inc_id}"`
            order = null;
            dt = await F_Select(select, table_name, whr, order);

            var repo_catg_id = 0;
            if (dt.msg.length > 0 && dt.suc > 0) {
                repo_catg_id = dt.msg[0].id;

                table_name = 'td_repository'
                fields = '(catg_id, form_name, form_path, created_by, created_at)'
                values = `("${dt.msg[0].id}", "Comcen Notification ${datetime} ${data.seq_no}", "${pdf_path}", "${data.user}", "${inc_datetime}")`
                flag = 0;
                res_dt = await F_Insert(table_name, fields, values, null, flag)
            } else {
                table_name = 'md_repository_category'
                fields = '(catg_name, created_by, created_at)'
                values = `("${data.inc_id}", "${data.user}", "${inc_datetime}")`
                flag = 0;
                catgres_dt = await F_Insert(table_name, fields, values, null, flag)

                repo_catg_id = catgres_dt.lastId.insertId;

                table_name = 'td_repository'
                fields = '(catg_id, form_name, form_path, created_by, created_at)'
                values = `("${catgres_dt.lastId.insertId}", "Comcen Notification ${datetime} ${data.seq_no}", "${pdf_path}", "${data.user}", "${inc_datetime}")`
                flag = 0;
                res_dt = await F_Insert(table_name, fields, values, null, flag)
            }

            if (res_dt.suc > 0) {
                table_name = 'td_comcen_notification'
                fields = '(inc_no, repo_catg_id, noti_dt, json_path, pdf_path, created_by, created_dt)'
                values = `("${data.inc_id}", "${repo_catg_id}", "${data.datetime}", "${json_path}", "${pdf_path}", "${data.user}", "${inc_datetime}")`
                res_dt = await F_Insert(table_name, fields, values, null, 0);
                res.send(res_dt);
            }
            else {
                res.send(res_dt)
            }
        }
        // console.log("JSON file has been saved.");
    });
})
// END //

// TESTING //
AddModrouter.get('/ab', async (req, res) => {
    var data = {
        id: 0,
        inc_id: 19,
        user: 'suman@synergicsoftek.in',
        ref_no: '002',
        handover_date: '2022-09-02T13:32',
        date: '2022-09-02T13:33',
        handover_by: '1',
        handover_to: '2',
        attended_by: 'All members',
        ongoing_act: 'Normal Operations',
        upcoming_act: 'Normal Operations',
        logistics: 'Supply Vessel Available',
        shore_act: 'Normal Operations',
        others: 'None',
        final_flag: 'N',
        file: null
    }
    var da = await MeetingPdfGen(data, null)
    // console.log(da);
    res.send('da')
})

module.exports = { AddModrouter, SaveLessonFinal, MakePDF, MeetingPdfGen, InvestigationPdfGen }