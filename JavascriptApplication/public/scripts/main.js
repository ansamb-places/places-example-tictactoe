type = location.search[1] || 'O';

setInterval(function() {
  $.get(location.origin + '/moves', function(data) {
    $.each(data, function(index, value) {
      $("#x" + value.data.x + "y" + value.data.y).text(value.data.value);
    });
  });
}, 1000);

$(".square").click(function(event) {
  var xpos = event.target.id[1] || 0;
  var ypos = event.target.id[3] || 0;
  $.ajax({
    url: location.origin + '/moves',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({x: xpos, y: ypos, value: type})
  });
  $(event.target).text(type);
});
