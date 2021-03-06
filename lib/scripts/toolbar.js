
// used to identify pickers
var pickercounter=0;

/**
 * Create a toolbar
 *
 * @param  string tbid       ID of the element where to insert the toolbar
 * @param  string edid       ID of the editor textarea
 * @param  array  tb         Associative array defining the buttons
 * @param  bool   allowblock Allow buttons creating multiline content
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function initToolbar(tbid,edid,tb, allowblock){
    var $ = jQuery;
    if (typeof tbid == 'string') {
        var toolbar = $('#' + tbid);
    } else {
        var toolbar = $(tbid);
    }

    if(toolbar.length == 0) return;

    var edit = $('#' + edid);
    if(edit.length == 0) return;

    if(edit.attr('readOnly')) return;

    if (typeof allowblock === 'undefined') {
        allowblock = true;
    }

    //empty the toolbar area:
    toolbar.html('');

    var cnt = tb.length;

    for(var i=0; i<cnt; i++){
        if (!allowblock && tb[i].block === true) {
            continue;
        }
        var actionFunc;

        // create new button (jQuery object)
        var btn = $(createToolButton(tb[i]['icon'],
                                   tb[i]['title'],
                                   tb[i]['key'],
                                   tb[i]['id'],
                                   tb[i]['class']));

        // type is a tb function -> assign it as onclick
        actionFunc = 'tb_'+tb[i]['type'];
        if( $.isFunction(window[actionFunc]) ){
            btn.bind('click', bind(window[actionFunc],btn,tb[i],edid) );
            toolbar.append(btn);
            continue;
        }

        // type is a init function -> execute it
        actionFunc = 'addBtnAction'+tb[i]['type'].charAt(0).toUpperCase()+tb[i]['type'].substring(1);
        if( $.isFunction(window[actionFunc]) ){
            if(window[actionFunc](btn, tb[i], edid)){
                toolbar.append(btn);
            }
            continue;
        }

        alert('unknown toolbar type: '+tb[i]['type']+'  '+actionFunc);
    } // end for

}

/**
 * Button action for format buttons
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @author Gabriel Birke <birke@d-scribe.de>
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function tb_format(btn, props, edid) {
    var sample = props['title'];
    if(props['sample']){
        sample = props['sample'];
    }
    insertTags(edid,
               fixtxt(props['open']),
               fixtxt(props['close']),
               fixtxt(sample));
    pickerClose();
    return false;
}

/**
 * Button action for format buttons
 *
 * This works exactly as tb_format() except that, if multiple lines
 * are selected, each line will be formatted seperately
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @author Gabriel Birke <birke@d-scribe.de>
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function tb_formatln(btn, props, edid) {
    var sample = props['title'];
    if(props['sample']){
        sample = props['sample'];
    }
    sample = fixtxt(sample);

    props['open']  = fixtxt(props['open']);
    props['close'] = fixtxt(props['close']);

    // is something selected?
    var opts;
    var selection = getSelection($(edid));
    if(selection.getLength()){
        sample = selection.getText();
        opts = {nosel: true};
    }else{
        opts = {
            startofs: props['open'].length,
            endofs: props['close'].length
        };
    }

    sample = sample.split("\n").join(props['close']+"\n"+props['open']);
    sample = props['open']+sample+props['close'];

    pasteText(selection,sample,opts);

    pickerClose();
    return false;
}

/**
 * Button action for insert buttons
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @author Gabriel Birke <birke@d-scribe.de>
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function tb_insert(btn, props, edid) {
    insertAtCarret(edid,fixtxt(props['insert']));
    pickerClose();
    return false;
}

/**
 * Button action for the media popup
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function tb_mediapopup(btn, props, edid) {
    window.open(
        DOKU_BASE+props['url']+encodeURIComponent(NS)+'&edid='+encodeURIComponent(edid),
        props['name'],
        props['options']);
    return false;
}

/**
 * Button action for automatic headlines
 *
 * Insert a new headline based on the current section level
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function tb_autohead(btn, props, edid){
    var lvl = currentHeadlineLevel(edid);

    // determine new level
    lvl += props['mod'];
    if(lvl < 1) lvl = 1;
    if(lvl > 5) lvl = 5;

    var tags = '=';
    for(var i=0; i<=5-lvl; i++) tags += '=';
    insertTags(edid, tags+' ', ' '+tags+"\n", props['text']);
    pickerClose();
    return false;
}


/**
 * Add button action for picker buttons and create picker element
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Gabriel Birke <birke@d-scribe.de>
 */
function addBtnActionPicker(btn, props, edid) {
    var pickerid = 'picker'+(pickercounter++);
    createPicker(pickerid, props, edid);

    btn.click(
        function() {
            pickerToggle(pickerid,btn);
            return false;
        }
    );

    return true;
}

/**
 * Add button action for the link wizard button
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function addBtnActionLinkwiz(btn, props, edid) {
    dw_linkwiz.init(jQuery('#'+edid));
    jQuery(btn).click(function(){
        dw_linkwiz.toggle();
        return false;
    });
    return true;
}


/**
 * Show/Hide a previosly created picker window
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function pickerToggle(pickerid,btn){
    var picker = jQuery('#' + pickerid);
    if (picker.css('marginLeft') == '-10000px'){
        var x = findPosX(btn[0]);
        var y = findPosY(btn[0]);

        picker.css('left',(x+3)+'px')
            .css('top', (y+btn[0].offsetHeight+3)+'px')
            .css('marginLeft', '0px')
            .css('marginTop', '0px');
    } else {
        picker.css('marginLeft', '-10000px')
            .css('marginTop', '-10000px');
    }
}

/**
 * Close all open pickers
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function pickerClose(){
    var pobjs = jQuery('#picker');
    for(var i=0; i<pobjs.length; i++){
        pobjs[i].css('marginLeft', '-10000px')
            .css('marginTop', '-10000px');
    }
}


/**
 * Replaces \n with linebreaks
 */
function fixtxt(str){
    return str.replace(/\\n/g,"\n");
}

