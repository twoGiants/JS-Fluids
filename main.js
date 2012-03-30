// globals: general
var FDS;
var CanvasElement;
var CanvasContext;
var canvas_width;
var canvas_height;
var canvas_pos_in_doc;
var canvas_pos_in_doc_x;
var canvas_pos_in_doc_y;
var inv_canvas_width;
var inv_canvas_height;
var CanvasElementCopy; // second canvas element used for double buffering
var CanvasContextCopy;
var CanvasImageDataCopy;

// globals: buttons
var start_stop_b;
var color_p_c;
var fps_b;

// FPS
var lastDate;
var fps;

$(document).ready(function(e)
{
  var grid_width  = N_;
  var grid_height = N_;
  var jQueryCanvasElement = $('#my_canvas'); 
  
  // get the canvas element and it's context
  CanvasElement = jQueryCanvasElement.get(0);
  CanvasContext = CanvasElement.getContext('2d');
  canvas_width  = parseInt(CanvasElement.getAttribute('width'));
  canvas_height = parseInt(CanvasElement.getAttribute('height'));

  // get the position of the canvas element inside the document;
  // used to calculate the position of the mouse when the cursor is moving
  // inside the canvas element
  canvas_pos_in_doc   = jQueryCanvasElement.position();
  canvas_pos_in_doc_x = canvas_pos_in_doc.left;
  canvas_pos_in_doc_y = canvas_pos_in_doc.top;
  
  // create inverted width and heigt for normalized positions inside the
  // element where we going to draw(our canvas)
  inv_canvas_width  = 1 / canvas_width;
  inv_canvas_height = 1 / canvas_height;
  
  // copy the canvas element and it's context;
  // used for double buffering
  CanvasElementCopy        = document.createElement('canvas'); // with jQuery: slower
  CanvasElementCopy.width  = grid_width;
  CanvasElementCopy.height = grid_height;
  CanvasContextCopy        = CanvasElementCopy.getContext('2d');
  CanvasImageDataCopy      = CanvasContextCopy.createImageData(grid_width, grid_height);

  // create a FDS object and initialise it
  FDS = new STJ.FluidDynamicsSolver();
  FDS.initFDS();
  
  // take care of buttons and register events to them
  // if mouse is moved, values are added to density and velocity
  registerUserInput();
  
  // start the main loop here
  setInterval(mainCallback, 30);
});

function registerUserInput()
{
  start_stop_b = false;
  color_p_c    = 0;
  fps_b        = false;
  
  // attach callback to mouse
  $(document).mousemove(mouseCallback);
  
  // attach callback to buttons
  $('#b0_start_stop').click(startStopButtonCallback);
  $('#b1_reset').click(resetButtonCallback);
  $('#b2_color').click(colorButtonCallback);
  $('#b3_fps').click(fpsButtonCallback);
}

// just some variables are set here, the fps calculation happens in calcFPS()
function fpsButtonCallback()
{
  lastDate = new Date;
  fps = 0;
  
  $('#b3_fps').children('#b3_text').fadeOut(200, fadeOutFadeIn);
  
  fps_b = !fps_b;
  
  function fadeOutFadeIn()
  {
    if(fps_b)
    {
      $(this).text(parseInt(fps)).fadeIn(200);
    }
    else
    {
      $(this).text('--').fadeIn(200);
    }
  }
}

// just the button text is changed, the color change happens in drawDensity()
function colorButtonCallback()
{ 
  $('#b2_color').children('#b2_text').fadeOut(200, fadeOutFadeIn);
  
  color_p_c++;
  
  function fadeOutFadeIn()
  {
    switch(color_p_c % 4)
    {
      case 0:
      {
        $(this).text('white').fadeIn(200);
        break;
      }
      case 1:
      {
        $(this).text('red').fadeIn(200);
        break;
      }
      case 2:
      {
        $(this).text('green').fadeIn(200);
        break;
      }
      case 3:
      {
        $(this).text('blue').fadeIn(200);
        break;
      }
    }
  }
}

// reset calculated values to the initial state
function resetButtonCallback()
{
  FDS.initFDS();
}

// just the button text is changed, the pause is happening in mainCallback()
function startStopButtonCallback()
{
  $('#b0_start_stop').children('#b0_text').fadeOut(200, fadeOutFadeIn);
  
  start_stop_b = !start_stop_b;
  
  function fadeOutFadeIn()
  {
    if(start_stop_b)
    {
      // initialize FDS values
      $(this).text('stop').fadeIn(200);
    }
    else
    {
      $(this).text('start').fadeIn(200);
    }
  }
}

// values resulting from mouse movement pushed to FDS
function mouseCallback(event)
{
  // capture mouse movement only if the start button was pressed
  if(start_stop_b)
  {
    var x = event.pageX - canvas_pos_in_doc.left;
    var y = event.pageY - canvas_pos_in_doc.top;
  
    prepareSource(x, y);
  }
}

function prepareSource(_x, _y)
{
  var x  = _x * inv_canvas_width;
  var y  = _y * inv_canvas_height;
  var dx = (_x - canvas_pos_in_doc_x) * inv_canvas_width;
  var dy = (_y - canvas_pos_in_doc_y) * inv_canvas_height;
  
  addSource(x, y, dx, dy);
  
  canvas_pos_in_doc_x = _x;
  canvas_pos_in_doc_y = _y;
}

// x,  y:  normalized mouse position inside the canvas element
// dx, dy: normalized direction of mouse movement 
function addSource(x, y, dx, dy)
{ 
  var movement = dx * dx  + dy * dy;
  var index    = 0;
  var multiplicator = 30;
  
  // check if mouse was moved
  if(movement > 0)
  {
    // check if mouse is outside the canvas element
    if(x < 0)
    {
      x = 0;
    }
    else if(x > 1)
    {
      x = 1;
    }
  
    if(y < 0)
    {
      y = 0;
    }
    else if(y > 1)
    {
      y = 1;
    }

    index = FDS.NORM_IX(x, y);
    
    // push values to FDS globals
    dens_prev_[index] = 1000;
    u_prev_[index]    = dx * multiplicator;
    v_prev_[index]    = dy * multiplicator;
  }
}

// draw fluid in the canvas element
function drawDensity()
{
  var img_data_i;
  var dens_index;
  
  // i: column, j: row
  for(var j = 1; j < (N_ + 1); j++)
  {
    for(var i = 1; i < (N_ + 1); i++)
    {
      // in case you need to know what that is:
      // https://developer.mozilla.org/En/HTML/Canvas/Pixel_manipulation_with_canvas
      img_data_i = ((j - 1) * N_ * 4) + ((i - 1) * 4);
      dens_index = FDS.REG_IX(i, j);
      
      // write RGB value to canvas
      // color button changes the color of the fluid
      switch(color_p_c % 4)
      {
        case 0:
        {
          CanvasImageDataCopy.data[img_data_i]     = dens_[dens_index];
          CanvasImageDataCopy.data[img_data_i + 1] = dens_[dens_index];
          CanvasImageDataCopy.data[img_data_i + 2] = dens_[dens_index];
          break;
        }
        case 1:
        {
          CanvasImageDataCopy.data[img_data_i]     = dens_[dens_index];
          CanvasImageDataCopy.data[img_data_i + 1] = 0;
          CanvasImageDataCopy.data[img_data_i + 2] = 0;
          break;
        }
        case 2:
        {
          CanvasImageDataCopy.data[img_data_i]     = 0;
          CanvasImageDataCopy.data[img_data_i + 1] = dens_[dens_index];
          CanvasImageDataCopy.data[img_data_i + 2] = 0;
          break;
        }
        case 3:
        {
          CanvasImageDataCopy.data[img_data_i]     = 0;
          CanvasImageDataCopy.data[img_data_i + 1] = 0;
          CanvasImageDataCopy.data[img_data_i + 2] = dens_[dens_index];
          break;
        }
      }
      CanvasImageDataCopy.data[img_data_i + 3] = 255; 
    }
  }
  
  // write new data back to the copy
  CanvasContextCopy.putImageData(CanvasImageDataCopy, 0, 0);
  // draw image on screen using the canvas copy
  CanvasContext.drawImage(CanvasElementCopy, 0, 0, canvas_width, canvas_height);
}

function calcFPS()
{
  var presentDate = new Date;
  fps = 1000 / (presentDate - lastDate);
  lastDate = presentDate;
  
  $('#b3_fps').children('#b3_text').text(parseInt(fps));
}

function mainCallback()
{
  // update fluid solver if start button was pressed
  if(start_stop_b)
  {
    FDS.update();
  }
  
  // calculate frames per second if the fps button was pressed
  if(fps_b)
  {
    calcFPS();
  }
  
  // draw density to canvas element
  drawDensity();
}