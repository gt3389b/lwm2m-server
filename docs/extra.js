
$( document ).ready(function() {
    console.log( "ready!" );


});

$(window).load(function(){

    $("code.text").parents('pre').addClass( "simple_text" );

    // remove the code tag for simple text
    $(".simple_text").find("code").contents().unwrap();

    $(".hljs").parents('pre').addClass( "command_input" );

    // add the class 'bug' to the **BUG** paragraph.
    $("strong:contains('BUG')").parent('p').addClass("bug");
    $("strong:contains('BUG')").remove();

    // add the class 'bug' to the **BUG** paragraph.
    $("strong:contains('INFO')").parent('p').addClass("info");
    $("strong:contains('INFO')").remove();

});