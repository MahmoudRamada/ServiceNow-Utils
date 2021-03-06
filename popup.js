var bgPage;
var tabid;
var g_ck;
var url;
var instance;
var urlFull;
var userName;
var roles;
var dtUpdateSets;
var dtUpdates;
var dtTables;
var dtDataExplore;
var dtScriptFields;
var tablesloaded = false;
var dataexploreloaded = false;
var userloaded = false;
var updatesetsloaded = false;
var updatesloaded = false;
var myFrameHref;
var datetimeformat;
var table;
var sys_id
var isNoRecord = true;
var snufsid = 'gfmcfepahcbpafgckmomdopifchjbdcg';// prod
//var snufsid = 'kbledokkkhpgehnehfghicncdndkdnoa';// dev
var snufsrunning = false;


document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        tabid = tabs[0].id;
        urlFull = tabs[0].url;
        bgPage = chrome.extension.getBackgroundPage();
        bgPage.getBrowserVariables(tabid);

//setIcon("images/icon32newer.png");

    });

});

function setIcon(icon){
    chrome.pageAction.setIcon({
    tabId: tabid,
    path : icon
    });
}

//Set variables, called by BG page after calling getRecordVariables
function setRecordVariables(obj, scriptsync) {

    isNoRecord = !obj.myVars.hasOwnProperty('NOWsysId');
    sys_id = obj.myVars.NOWsysId || obj.myVars.mySysId;
    table = obj.myVars.NOWtargetTable;

    if (!table)
        table = (myFrameHref || urlFull).match(/com\/(.*).do/)[1].replace('_list', '');
    if (!sys_id)
        sys_id = (getParameterByName('sys_id',myFrameHref || urlFull));


    var xmllink = url + '/' + obj.myVars.NOWtargetTable + '.do?sys_id=' + obj.myVars.NOWsysId + '&sys_target=&XML';
    $('#btnviewxml').click(function () {
        window.open(xmllink, '_blank');
    }).prop('disabled', isNoRecord);



    $('#btnupdatesets').click(function () {
        window.open(url + '/sys_update_set_list.do?sysparm_query=state%3Din%20progress', '_blank');
    });

    if (scriptsync) {
        createScriptSyncChecboxes(table, sys_id);
    }

    $('#waitinglink, #waitingscript').hide();

}


function checkSnufsRunning() {
    chrome.runtime.sendMessage(snufsid, { checkRunning: true, instance: instance },
        function (response) {
            if (typeof response == 'undefined') {
                chrome.management.launchApp(snufsid, function (resp) {
                    chrome.runtime.sendMessage(snufsid, { checkRunning: true, instance: instance },
                        function (res) {
                            if (typeof res == 'undefined') {
                                $('#sciptcontainerdiv').html('Please install <a href="https://chrome.google.com/webstore/detail/gfmcfepahcbpafgckmomdopifchjbdcg" target="_blank">ServiceNow Utils SciptSyncer</a> from the Chrome Webstore!' + '<br />Or enable it from your extension page if you disabled it.');
                            }
                        });
                });
            }
        });
}

//Place the key value pair in the chrome local storage, with metafield for date added.
function setToChromeStorage(theName, theValue) {
    var myobj = {};
    myobj[instance + "-" + theName] = theValue;
    myobj[instance + "-" + theName + "-date"] = new Date().toDateString();
    chrome.storage.local.set(myobj, function () {

    });
}

//Place the key value pair in the chrome sync storage.
function setToChromeSyncStorage(theName, theValue) {
    var myobj = {};
    myobj[instance + "-" + theName] = theValue;
    chrome.storage.sync.set(myobj, function () {

    });
}

//Try to get saved form state and set it
function setFormFromSyncStorage(callback) {
    var query = instance + "-formvalues";
    chrome.storage.sync.get(query, function (result) {
        if (query in result) {
            $('form').deserialize(result[query]);
        }
        callback();
    })
}

//Try to get json with servicenow tables, first from chrome storage, else via REST api
function prepareJsonTable() {
    var query = [instance + "-tables", instance + "-tables-date"];
    chrome.storage.local.get(query, function (result) {
        try {
            var thedate = new Date().toDateString();
            if (thedate == result[query[1]].toString()) {
                setDataTableTables(result[query[0]]);
            }
            else
                bgPage.getTables();
        }
        catch (err) {
            bgPage.getTables();
        }
    })
}


//Try to get json with servicenow tables, first from chrome storage, else via REST api
function prepareJsonScriptFields() {
    var query = [instance + "-scriptfields", instance + "-scriptfields-date"];
    chrome.storage.local.get(query, function (result) {
        try {
            var thedate = new Date().toDateString();
            if (thedate == result[query[1]].toString()) {
                dtScriptFields = result[query[0]];
            }
            else
                bgPage.getScriptFields();
        }
        catch (err) {
            bgPage.getScriptFields();
        }
    })
}

//add object to storage and refresh datatable
function setScriptFields(jsn) {
    dtScriptFields = jsn;
    setToChromeStorage("scriptfields", jsn);
}


//Set variables, called by BG page after calling getBrowserVariables
//Also attach event handlers.
function setBrowserVariables(obj) {
    
    g_ck = obj.myVars.g_ck || '';
    url = obj.url;
    instance = url.replace("https://", "").replace(".service-now.com", "");
    userName = obj.myVars.NOWusername || obj.myVars.NOWuser_name;
    //roles = obj.myVars.NOWuserroles ;
    datetimeformat = obj.myVars.g_user_date_time_format;
    myFrameHref = obj.frameHref;

    setFormFromSyncStorage(function () {
        $('.nav-tabs a[data-target="' + $('#tbxactivetab').val() + '"]').tab('show');
    });


    //Attach eventlistners
    $('#btnGetUser').click(function () {
        getUserDetails(false);
    });
    //Attach eventlistners
    $('#btncreatefiles').click(function () {
        sendToSnuFileSync();
    });
    $('#tbxname').keypress(function (e) {
        if (e.which == '13') {
            getUserDetails(false);
        }
    });
    $('#btnrefreshtables').click(function () {
        $('#waitingtables').show();
        bgPage.getScriptFields();
        bgPage.getTables();
    });

    $('input').on('blur', function () {
        setToChromeSyncStorage("formvalues", $('form .sync').serialize());
    })

    $('#btnSetGRName').click(function () {
        getGRQuery();
    });
    $('#tbxgrname').keypress(function (e) {
        if (e.which == '13') {
            getGRQuery();
        }
    });
    $('#tbxgrtemplate').change(function (e) {
        getGRQuery();
    });


    $.fn.dataTable.moment('DD-MM-YYYY HH:mm:ss');
    $.fn.dataTable.moment(datetimeformat);

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var target = $(e.target).data("target") // activated tab

        $('#tbxactivetab').val(target);
        setToChromeSyncStorage("formvalues", $('form .sync').serialize());

        switch (target) {
            case "#tabupdatesets":
                if (!updatesetsloaded) {
                    $('#waitingupdatesets').show();
                    bgPage.getUpdateSets();
                    updatesetsloaded = true;
                }
                $('#tbxupdatesets').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabupdates":
                if (!updatesloaded) {
                    $('#waitingupdates').show();
                    bgPage.getUpdates(userName);

                    updatesloaded = true;
                }
                $('#tbxupdates').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabtables":
                if (!tablesloaded) {
                    $('#waitingtables').show();
                    prepareJsonTable();
                    tablesloaded = true;
                }
                $('#tbxtables').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabdataexplore":
                if (!dataexploreloaded) {
                    $('#waitingdataexplore').show();
                     bgPage.getExploreData();
                     dataexploreloaded = true;
                }
                $('#tbxtables').focus(function () {
                    $(this).select();
                });
                break;        
            case "#tablink":
                $('#waitinglink').show()
                bgPage.getRecordVariables(false);
                break;
            case "#tabgr":
                getGRQuery();
                break;
            case "#tabscript":
                checkSnufsRunning()
                //$('#waitingscript').show()
                prepareJsonScriptFields();
                bgPage.getRecordVariables(true);
                break;
            case "#tabuser":
                if (!userloaded) {
                    if ($('#tbxname').val().length > 0)
                        getUserDetails(false);
                    userloaded = true;
                }
                $('#tbxname').focus(function () {
                    $(this).select();
                });
                break;
        }
    });


    // if ('' + myFrameHref.length > 10) {
    //     $('#popout').click(function () {
    //         chrome.tabs.update({
    //             url: myFrameHref
    //         });
    //         window.close();
    //     });
    //     $('#popin').css('color', '#e5e5e5').addClass('not-active');
    // }
    // else {
    //     $('#popin').click(function () {
    //         var newHref = encodeURIComponent(urlFull.replace(url, ''));
    //         var newUrl = url + '/nav_to.do?uri=' + newHref;
    //         chrome.tabs.update({
    //             url: newUrl
    //         });
    //         window.close();
    //     });
    //     $('#popout').css('color', '#e5e5e5');
    // }
    // $('#popoutcopy').click(function () {
    //     var newHref =  myFrameHref || urlFull;
    //     window.open(newHref, '_blank');
    //     window.close();
    // });



    chrome.tabs.sendMessage(tabid, { method: "getSelection" }, function (selresponse) {
        var selectedText = ('' + selresponse.selectedText).trim();
        if (selectedText.length > 0 && selectedText.length <= 30)
            getUserDetails(selectedText);

    });


}

//Set message, on about tab, callback from getInfoMessage
function setInfoMessage(html) {
    $('#livemessage').html(html);
}


function getGRQuery() {

    var newHref = myFrameHref || urlFull;
    if ((newHref.split('?')[0]).indexOf('_list.do') > 1) {
        bgPage.getGRQuery($('#tbxgrname').val(),$('#tbxgrtemplate').val());
    }
    else {
        bgPage.getGRQueryForm($('#tbxgrname').val(),$('#tbxgrtemplate').val());
    }
}

function setGRQuery(gr) {
    if (gr.indexOf("GlideRecord('undefined')")  > -1) gr = "This only works in forms and lists."
        $('#txtgrquery').val(gr).select();
}


//next release, integrate with other extension
function createScriptSyncChecboxes(tbl, sysid) {
    var fields = []
    if (dtScriptFields) {
        fields = dtScriptFields.filter(function (el) {
            return el.name == tbl;
        }).sort()
    }

    if (fields.length == 0) {
        $('#sciptcontainerdiv').html('No fields to edit found on current page..');
        return;
    }

    $('#scripttable').html(tbl);

    if (fields) {
        var scripthtml = ''
        for (var i = 0; i < fields.length; i++) {
            var checked = (fields[i].element == 'script') ? 'checked="checked"' : '';

            scripthtml += '<div class="checkbox"><label><input class="scriptcbx" data-type="' + fields[i]['internal_type.name'] + '" type="checkbox" '
                + checked
                + ' value="' + fields[i].element + '">' + fields[i].element + ' (' + fields[i]['internal_type.name'] + ')</label></div>';

        }
        $('#scriptform').html(scripthtml);
    }
}

function sendToSnuFileSync() {

    var url = 'https://' + instance + '.service-now.com/api/now/table/' + table + '/' + sys_id;

    bgPage.loadXMLDoc(g_ck, url, "", function (respons) {
        var idx = 0
        $('input.scriptcbx:checked').each(function (index, item) {
            var tpe = $(this).data('type');
            //console.log('div' + value + ':' + $(this).data('type'));
            idx++;
            var ext = '.js';
            if (tpe.indexOf('html') > -1) ext = '.html';
            else if (tpe.indexOf('xml') > -1) ext = '.xml';
            chrome.runtime.sendMessage(
                snufsid,
                {
                    instance: instance,
                    table: table,
                    sys_id: sys_id,
                    field: item.value,
                    name: respons.result.name || 'unknown',
                    extension: ext,
                    content: respons.result[item.value] || ''
                },
                function (response) {
                    // console.log(response);
                });
        });
        $('#scriptmessage').html(idx + ' file(s) created');

    });

}


//Initiate Call to servicenow rest api
function getUserDetails(usr) {
    if (!usr) usr = $('#tbxname').val();
    $('#tbxname').val(usr);
    $('#waitinguser').show();
    bgPage.getUserDetails(usr);
}

//Set the user details table
function setUserDetails(html) {
    $('#rspns').html(html);

    if ($('#createdby').length > 0) {
        $('.nav-tabs a[data-target="#tabuser"]').tab('show');
        $('#createdby').click(function () {
            var usr = $(this).data('username');
            $('#tbxname').val(usr).focus(function () {
                $(this).select();
            });

            bgPage.getUserDetails(usr);
        });
    }
    else
        $('#tbxname').val('');

    $('#waitinguser').hide();
}

//set or refresh datatable with ServiceNow updatesets
function setDataTableUpdateSets(nme) {

    if (nme == 'error'){
        $('#updatesets').hide().after('<br /><div class="alert alert-danger">Data can not be retrieved, are you Admin?</div>');
        $('#waitingupdatesets').hide();
        return false;
    }

    console.log(nme)
    $('#btnnewupdateset').attr('href', url + '/nav_to.do?uri=%2Fsys_update_set.do%3Fsys_id%3D')
    $('#btnopenupdatesets').attr('href', url + '/nav_to.do?uri=%2Fsys_update_set_list.do?sysparm_query=state%3Din%20progress');

    if (dtUpdateSets) dtUpdateSets.destroy();
    dtUpdateSets = $('#updatesets').DataTable({
        "aaData": nme.result.updateSet,
        "aoColumns": [
            { "mDataProp": "name" },
            {
                mRender: function (data, type, row) {
                    var iscurrent = "";
                    if (row.sysId == nme.result.current.sysId) iscurrent = "iscurrent";
                    return "<a href='" + url + "/nav_to.do?uri=sys_update_set.do?sys_id=" + row.sysId + "' title='Table definition' target='_blank'><i class='fa fa-list' aria-hidden='true'></i></a> " +
                        "<a class='setcurrent " + iscurrent + "' data-post='{name: \"" + row.name + "\", sysId: \"" + row.sysId + "\"}' href='#" + row.sysId + "' title='Set curren updateset'><i class='fa fa-dot-circle-o' aria-hidden='true'></i></a> ";
                }
            }
        ],
        "drawCallback": function () {
            var row0 = $("#updatesets tbody tr a.iscurrent").closest('tr').clone();
            $('#updatesets tbody tr:first').before(row0.css('background-color', '#5ebeff'));
        },
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false

    });

    $('#tbxupdatesets').keyup(function () {
        dtUpdateSets.search($(this).val()).draw();
    }).focus().trigger('keyup');

    $('a.setcurrent').click(function () {
        $('#waitingupdatesets').show();
        bgPage.setUpdateSet($(this).data('post'));
    });

    $('#waitingupdatesets').hide();

}

//set or refresh datatable with ServiceNow tables
function setDataTableUpdates(nme) {

    if (nme == 'error'){
        $('#updts').hide().after('<br /><div class="alert alert-danger">Data can not be retrieved, are you Admin?</div>');
        $('#waitingupdates').hide();
        return false;
    }

    if (dtUpdates) dtUpdates.destroy();

    dtUpdates = $('#updts').DataTable({
        "aaData": nme.result,
        "aoColumns": [
            { "mDataProp": "type" },
            { "mDataProp": "target_name" },
            { "mDataProp": "sys_updated_on" },
            { "mDataProp": "update_set\\.name" },
            {
                mRender: function (data, type, row) {
                    var i = row.name.lastIndexOf("_");
                    return "<a href='" + url + '/' + row.name.substr(0, i) + ".do?sys_id=" + row.name.substr(i + 1) + "' target='_blank' title='Open related record' ><i class='fa fa-pencil-square-o' aria-hidden='true'></i></a> " +
                        "<a href='" + url + "/sys_update_xml.do?sys_id=" + row.sys_id + "' target='_blank' title='View update' ><i class='fa fa-history' aria-hidden='true'></i></a> ";
                }
            }
        ],
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "order": [[2, "desc"]],
        "paging": false

    });

    $('#tbxupdates').keyup(function () {
        dtUpdates.search($(this).val()).draw();
    }).focus().trigger('keyup');


    $('#waitingupdates').hide();
}


//add object to storage and refresh datatable
function setTables(jsn) {
    setToChromeStorage("tables", jsn);
    setDataTableTables(jsn);
}

//set or refresh datatable with ServiceNow tables
function setDataTableTables(nme) {

    if (dtTables) dtTables.destroy();

    dtTables = $('#tbls').DataTable({
        "aaData": nme,
        "aoColumns": [
            { "mDataProp": "label" },
            { "mDataProp": "name" },
            {
                mRender: function (data, type, row) {
                    return "<a href='" + url + '/' + row.name + "_list.do' target='_blank' title='Go to list' ><i class='fa fa-table' aria-hidden='true'></i></a> " +
                        "<a href='" + url + "/nav_to.do?uri=sys_db_object.do?sys_id=" + row.name + "%26sysparm_refkey=name' title='Go to dictionary' target='_blank'><i class='fa fa-cog' aria-hidden='true'></i></a> " +
                        "<a href='" + url + "/generic_hierarchy_erd.do?sysparm_attributes=table_history=,table=" + row.name + ",show_internal=true,show_referenced=true,show_referenced_by=true,show_extended=true,show_extended_by=true,table_expansion=,spacing_x=60,spacing_y=90,nocontext' title='Show Schema Map' target='_blank'><i class='fa fa-sitemap' aria-hidden='true'></i></a>";
                }
            }
        ],
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        "dom": 'rti<"btns"B>',
        "buttons": [
        "copyHtml5","excelHtml5"
        ]

    });

    $('#tbxtables').keyup(function () {
        dtTables.search($(this).val()).draw();
    }).focus().trigger('keyup');


    $('#waitingtables').hide();
}


//set or refresh datatable with ServiceNow tables
function setDataExplore(nme) {

    if (dtDataExplore) dtTables.destroy();
//$('#dataexplore').html(nme);
    dtDataExplore = $('#dataexplore').DataTable({
        "aaData": nme,
        "aoColumns": [

            { "mDataProp": "meta.label"},
            { "mDataProp": "name"},
            { "mDataProp": "meta.type"},
            { "mDataProp": "value"},
            { "mDataProp": "display_value"}
        ],
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        "dom": 'rti<"btns"B>',
        "buttons": [
        "copyHtml5", "excelHtml5",
            {
                text: 'Toggle Type',
                action: function ( e, dt, node, config ) {
                    var vis = !dtDataExplore.column(2).visible();
                    dtDataExplore.column(2).visible(vis);

                }
            }
        ]

    });

    $('#tbxdataexplore').keyup(function () {
        dtDataExplore.search($(this).val()).draw();
    }).focus().trigger('keyup');


    $('#waitingdataexplore').hide();

}

