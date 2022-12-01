var myName;
var socket = io.connect(window.location.origin);
var chat = new chatterbox(socket);
var board = new WhiteBoard(d3, socket, 'whiteboard');

function getUrlVars() {
	var vars = [],
		hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for (var i = 0; i < hashes.length; i++) {
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}

var id = getUrlVars()['id'];

socket.emit('getBoardInfo', {
	id: id
});

socket.on('errorhandler', function(data) {
	$("#content").hide();
	$("#errormessage").html(data.message).show();
});

socket.on('joinerror', function(data) {
	if (data.message == "Invalid session") {
		$('#myModal').modal('show');
	} else {
		$('#joinErrorMessage').html(data.message).show();
	}
});

socket.on('welcome', function(data) {
	chat.setUserInfo(data);
	Cookies.set(id + '-sessionId', data.id, {
		path: location.pathname
	});
	$('#joinErrorMessage').hide();
	$('#myModal').modal('hide');
	$("#content").show();
});

$('#closeName').click(function() {
	socket.emit('join', {
		id: id,
		name: $('#myName').val(),
		gravatarId: window.md5($('#myEmail').val().trim().toLowerCase())
	});
});

socket.on('boardInfo', function(data) {
	$('#boardName').html(data.name);
	document.title = "Welcome to " + data.name;
	chat.setBoardName(data.name);
	var oldSessionId = Cookies.get(id + '-sessionId');
	if (oldSessionId) {
		socket.emit('rejoin', {
			id: id,
			sessionId: oldSessionId
		});
	} else {
		$('#myModal').modal('show');
	}
});

$(window).load(function() {
	board.selectTool("pen");
	board.selectColor("black");
});

$("#fblogin").click(function() {
	FB.login(function(response) {
		if (response.status === 'connected') {
			FB.api('/me', function(response) {
				socket.emit('join', {
					id: id,
					name: response.name,
					facebookId: response.id
				});
			});
		} else if (response.status === 'not_authorized') {
			// The person is logged into Facebook, but not your app.
		} else {
			// The person is not logged into Facebook, so we're not sure if
			// they are logged into this app or not.
		}
	}, {
		scope: 'public_profile'
	});
});

$('#colorPicker').spectrum({
	change: function(color) {
		board.selectColor(color.toHexString());
		$(this).children('span').css("background-color", color.toHexString());
	}
});

$('#fillPicker').spectrum({
	allowEmpty: true,
	showAlpha: true,
	change: function(color) {
		if (color == null) {
			board.selectFill("none");
			$(this).children('span').css("background-color", "").css("background", "url(./images/no-color.png) -1px -1px no-repeat no-repeat");
		} else {
			board.selectFill(color.toRgbString());
			$(this).children('span').css("background", "").css("background-color", color.toRgbString());
		}
	}
});


['black', 'white', 'red', 'green', 'blue', 'yellow'].forEach(function(color) {
	$("#" + color).click(function() {
		board.selectColor(color);
		$('#colorPicker').children('span').css("background-color", color);
		$('#colorPicker').spectrum("set", color);
	});
});

$("#penTool").click(function() {
	board.selectTool("pen");
	board.deselectAll();
});

$("#lineTool").click(function() {
	board.selectTool("line");
	board.deselectAll();
});


$("#ellipseTool").click(function() {
	board.selectTool("ellipse");
	board.deselectAll();
});


$("#rectTool").click(function() {
	board.selectTool("rectangle");
	board.deselectAll();
});


$("#eraserTool").click(function() {
	board.selectTool("eraser");
	board.deselectAll();
});

var _selection = null;
var textpos = null;

board.onCreateText(function (selection, x, y) {
	if(selection) {
		_selection = selection;
		$("#myText").val(selection.options.text);
		$("#myText_font option:contains('" + selection.options.font + "')").attr('selected','selected');
		$("#myText_size option:contains('" + selection.options.size + "')").attr('selected','selected');
	} else {
		textpos = { x: x, y: y };
	}
	$("#textModal").modal("show");
	$("#textModal").on("shown.bs.modal", function() {
		$("#myText").focus().select();
	});
})

$("#addTextBtn").click(function() {
	if(_selection && !Array.isArray(_selection) && _selection.type == 'text') {
		board.updateSelection({ 
			text: $("#myText").val(),
			font: $("#myText_font option:selected").text(),
			size: $("#myText_size option:selected").text(),
		});
		_selection = null;
	} else {
		board.addText({
			text: $("#myText").val(),
			font: $("#myText_font option:selected").text(),
			size: $("#myText_size option:selected").text(),
			width: null,
			height: null,
			x: textpos.x,
			y: textpos.y
		});
		textpos = null;
	}
	
	$("#textModal").modal("hide");
	$("#myText").val(null);
});


$("#textTool").click(function() {
	board.selectTool("text");
	board.deselectAll();
});

$("#cancelTextBtn").click(function() {
	$("#textModal").modal("hide");
});

$("#selectTool").click(function() {
	board.selectTool("select");
	board.deselectAll();
});

$("#deleteAction").click(function() {
	board.removeSelected();
});

$("#imgAction").click(function() {
	$("#imgUploadModal").modal("show")
});

$("#cancelImageBtn").click(function() {
	$("#imgUploadModal").modal("hide")
});

$("#emoticons").click(function(event) {
	var offset = $("#emoticons").offset();
	$("#emoticons_for_comments").css({top: offset.top - 300, left: offset.left, position:'absolute'}).show();
	event.stopPropagation();
});

$("#emoticons_for_comments div span").click(function() {
	$("#chatinput").val($("#chatinput").val() + $(this).attr("data-emoticon"));
	$("#emoticons_for_comments").hide();
});


$("#selectTool").click();

board.selectColor("black");

function convertImgToBase64URL(url, callback, outputFormat) {
	var img = new Image();
	img.crossOrigin = 'Anonymous';
	img.onload = function() {
		var canvas = document.createElement('CANVAS'),
			ctx = canvas.getContext('2d'),
			dataURL;
		canvas.height = this.height;
		canvas.width = this.width;
		ctx.drawImage(this, 0, 0);
		dataURL = canvas.toDataURL(outputFormat);
		callback(dataURL);
		canvas = null;
	};
	img.src = url;
}

function loadImage(url) {
	var preloadImg = new Image();
	preloadImg.onload = function() {
		var w = $("#whiteboard").width();
		var h = $("#whiteboard").height();
		var f = 1;
		if(preloadImg.width > w) f *= w / preloadImg.width;
		if((preloadImg.height * f) > h) f *= h / (preloadImg.height * f);
		
		board.addImage({
			href: url,
			width: preloadImg.width * f,
			height: preloadImg.height * f,
			offset: {
				x: 0,
				y: 0
			}
		});
		$("#imgUploadModal").modal("hide")
	}
	preloadImg.src = url;
}

board.onselect(function(selection) {
	if(Array.isArray(selection)) {
		
	} else {
		if(selection.type=='path' || selection.type=='rectangle' || selection.type=='ellipse'){
			$('#colorPicker').children('span').css("background-color", selection.options.color);
			$('#colorPicker').spectrum("set", selection.options.color);
			board.selectColor(selection.options.color);
			if (!selection.options.fill || selection.options.fill == "none") {
				board.selectFill("none");
				$('#fillPicker').children('span').css("background-color", "").css("background", "url(./images/no-color.png) -1px -1px no-repeat no-repeat");
				$('#fillPicker').spectrum("set", null);
			} else {
				board.selectFill(selection.options.fill);
				$('#fillPicker').children('span').css("background", "").css("background-color", selection.options.fill);
				$('#fillPicker').spectrum("set", selection.options.fill)
			}
		}
	}
})

$("#uploadImageBtn").click(function() {
	if ($("#url-tab").hasClass("active")) {
		loadImage($('#imageUploadUrl').val());
		$('#imageUploadUrl').val(null);
	} else {
		var file = $('#fileupload')[0].files[0];
		fr = new FileReader();
		fr.onload = function() {
			loadImage(this.result);
			$("#imgUploadModal").modal("hide")
		}
		fr.readAsDataURL(file);
	}
});

function resize() {
	var win = $(window);
	var chat = $("#chatspace");
	chat.height(win.height() - 80 - 80 - $("nav").height());
	board.setSize(win.width() - 400, win.height() - 50 - 80 - $("nav").height());
}

function selectLineWeight(weight) {
	$('#lineWeightTool div').height(weight);

	board.selectLineWeight(weight);
}

$(document).click(function() {
	$("#emoticons_for_comments").hide();
})

$(window).resize(function() {
	resize();
});

$(window).load(function() {
	resize();
});

$(window).bind('beforeunload', function(){
  return 'You are about to leave ' + chat.getBoardName();
});

var hiddenInput = $('#hiddentext');
var fragmentPattern = /^<html><body><!--StartFragment-->.*<!--EndFragment--><\/body><\/html>$/i;

['cut', 'copy', 'paste'].forEach(function(event) {
    document.addEventListener(event, function(e) {
			if (document.activeElement !== $('#whiteboard')[0]) return;

			var clipboardData = e.clipboardData;

			hiddenInput.text(' ');
			hiddenInput.focus().select();

			if (event === "copy") {
				var selectedObjects = board.getSelection();
				clipboardData.clearData();
				clipboardData.setData('text', selectedObjects.toString()); 
			} else if (event === "paste") {
				var items = clipboardData.items;
				var item = null;
				for (var i = 0; i < items.length; i++) {
					item = items[i];
				}
				
				if(item != null) {
					switch(item.kind) {
						case "file":
							var blob = item.getAsFile();
							var reader = new FileReader();
							reader.onload = function(evt){
								loadImage(evt.target.result);
							};
							reader.readAsDataURL(blob);
							break;
						case "string":
							var text = clipboardData.getData(item.type);
							if(fragmentPattern.test(text)) {
								text = $(text).text();
							}
							board.addText({
								text: text,
								font: "Arial",
								size: "12",
								x: 100,
								y: 100
							});
							break;
					}
				}
			}
    });
});
