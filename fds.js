var STJ = STJ || {};

var N_         = 30;
var dens_      = [];
var dens_prev_ = [];
// later
//var dens_R_    = [];
//var dens_G_    = [];
//var dens_B_    = [];
//var dens_R_prev_ = [];
//var dens_G_prev_ = [];
//var dens_B_prev_ = [];
var u_         = [];
var u_prev_    = [];
var v_         = [];
var v_prev_    = [];
var visc_      = 0.001;
var diff_      = 0.0001;
var dt_        = 1;

var help = 
{
  x0: [],
  x1: [],
  x2: [],
  x3: []
};

STJ.FluidDynamicsSolver = function()
{
  
// PRIVATE:
  var FADESPEED = 0.001;
  
// PUBLBIC:
  this.initFDS = function()
  {
    var i;
    var size;
    
    size = (N_ + 2) * (N_ + 2);
    
    for(i = 0; i < size; i++)
    {
      dens_[i]      = 0; 
      dens_prev_[i] = 0;
      // later
//      dens_R_[i]    = 0;
//      dens_G_[i]    = 0;
//      dens_B_[i]    = 0;
//      dens_R_prev_[i] = 0;
//      dens_G_prev_[i] = 0;
//      dens_B_prev_[i] = 0;
      u_[i]         = 0;
      u_prev_[i]    = 0;
      v_[i]         = 0;
      v_prev_[i]    = 0; 
    }
  };
  
  this.update = function()
  {
    velocityStep();
    densityStep();
    fadeOut();
  };
  
// PRIVATE:
  var fadeOut = function()
  {
    var i;
    var size = (N_ + 2) * (N_ + 2);
    
    for(i = 0; i < size; i++)
    {
      u_prev_[i] = v_prev_[i] = dens_prev_[i] = 0;
      dens_[i] = dens_[i] * (1 - FADESPEED);
      u_[i] = u_[i] * (1 - FADESPEED);
      v_[i] = v_[i] * (1 - FADESPEED);
    }
  };
  
  var velocityStep = function()
  {
    var tmp  = 0;
// 1.---------------------------------------------------------------------------  
    addSource(u_, u_prev_);
    u_      = help.x0;
    u_prev_ = help.x1;

// 2.---------------------------------------------------------------------------    
    addSource(v_, v_prev_);
    v_      = help.x0;
    v_prev_ = help.x1;
    
    // SWAP u---------
    tmp     = u_prev_;
    u_prev_ = u_;
    u_      = tmp;
    // END-SWAP-------
    
// 3.---------------------------------------------------------------------------    
    viscosity(1, u_, u_prev_);
    u_      = help.x0;
    u_prev_ = help.x1;
    
    // SWAP v---------
    tmp     = v_prev_;
    v_prev_ = v_;
    v_      = tmp;
    // END-SWAP-------
    
// 4.---------------------------------------------------------------------------    
    viscosity(2, v_, v_prev_);
    v_      = help.x0;
    v_prev_ = help.x1;
    
// 5.---------------------------------------------------------------------------
    projection(u_, v_, u_prev_, v_prev_);
    u_      = help.x0;
    u_prev_ = help.x1;
    v_      = help.x2;
    v_prev_ = help.x3;
    
    // SWAP u---------
    tmp     = u_prev_;
    u_prev_ = u_;
    u_      = tmp;
    // END-SWAP-------
    
    // SWAP v---------
    tmp     = v_prev_;
    v_prev_ = v_;
    v_      = tmp;
    // END-SWAP-------
    
// 6.---------------------------------------------------------------------------
    advection(1, u_, u_prev_, u_prev_, v_prev_);
    u_      = help.x0;
    u_prev_ = help.x1;
    
// 7.---------------------------------------------------------------------------
    advection(2, v_, v_prev_, u_prev_, v_prev_);
    v_      = help.x0;
    v_prev_ = help.x1;
    
    projection(u_, v_, u_prev_, v_prev_);
    u_      = help.x0;
    u_prev_ = help.x1;
    v_      = help.x2;
    v_prev_ = help.x3;
  };
  
  var densityStep = function()
  {
// 8.---------------------------------------------------------------------------
    addSource(dens_, dens_prev_);
    dens_      = help.x0;
    dens_prev_ = help.x1;
    
    // SWAP dens------------
    tmp        = dens_prev_;
    dens_prev_ = dens_;
    dens_      = tmp;
    // END-SWAP-------------
    
// 9.---------------------------------------------------------------------------
    diffusion(0, dens_, dens_prev_);
    dens_      = help.x0;
    dens_prev_ = help.x1;
    
    // SWAP dens------------
    tmp        = dens_prev_;
    dens_prev_ = dens_;
    dens_      = tmp;
    // END-SWAP-------------
    
// 10.--------------------------------------------------------------------------
    advection(0, dens_, dens_prev_, u_, v_);
    dens_      = help.x0;
    dens_prev_ = help.x1;
  };
  
  var addSource = function(x, s)
  {
    var i;
    var grid_size;
    
    grid_size = (N_ + 2) * (N_ + 2);
    
    for(i = 0; i < grid_size; i++)
    {
      x[i] += dt_ * s[i];
    }
    
    help.x0 = x;
    help.x1 = s;
  };
  
  // later
//  var addSourceRGB = function()
//  {
//    // do stuff here
//  };
  
  var gaussSeidel = function(b, x, x_prev, a, c)
  {
    var i;
    var j;
    var k;
    var brace;
    
    // Iterating Gauss-Seidel 20 times to get a good approximation
    for(k = 0; k < 20; k++)
    {
      for(i = 1; i <= N_; i++)
      {
        for(j = 1; j <= N_; j++)
        {
          brace = x[IX(i - 1, j    )] + x[IX(i + 1, j    )] +
                  x[IX(i,     j - 1)] + x[IX(i,     j + 1)];
          
          x[IX(i, j)] = (x_prev[IX(i, j)] + a * brace) / c;
        }
      }
      
      setBoundary(b, x);
      x = help.x0;
    }
    
    help.x0 = x;
    help.x1 = x_prev;
  };
  
  var setBoundary = function(b, x)
  {
    var i;
    
    for(i = 1; i <= N_; i++)
    {
      x[IX(0,      i     )] = (b == 1) ? -x[IX(1,  i )] : x[IX(1,  i )];
      x[IX(N_ + 1, i     )] = (b == 1) ? -x[IX(N_, i )] : x[IX(N_, i )];
      x[IX(i,      0     )] = (b == 2) ? -x[IX(i,  1 )] : x[IX(i,  1 )];
      x[IX(i,      N_ + 1)] = (b == 2) ? -x[IX(i,  N_)] : x[IX(i,  N_)];
    }

    x[IX(0,      0     )] = 0.5 * (x[IX(1,  0     )] + x[IX(0,      1 )]);
    x[IX(0,      N_ + 1)] = 0.5 * (x[IX(1,  N_ + 1)] + x[IX(0,      N_)]);
    x[IX(N_ + 1, 0     )] = 0.5 * (x[IX(N_, 0     )] + x[IX(N_ + 1, 1 )]);
    x[IX(N_ + 1, N_ + 1)] = 0.5 * (x[IX(N_, N_ + 1)] + x[IX(N_ + 1, N_)]);
    
    help.x0 = x;
  };
  
  var diffusion = function(b, x, x_prev)
  {
    var a;
    var c;
    
    a = dt_ * diff_ * N_ * N_;
    c = (1 + 4 * a);
    
    gaussSeidel(b, x, x_prev, a, c);
  };
  
  var viscosity = function(b, x, x_prev)
  {
    var a;
    var c;
    
    a = dt_ * visc_ * N_ * N_;
    c = (1 + 4 * a);
    
    gaussSeidel(b, x, x_prev, a, c);
  };
  
  var advection = function(b, d, d_prev, u, v)
  {
    var i,  j;
    var i0, j0;
    var i1, j1;
    var x,  y;
    var s0, t0;
    var s1, t1;
    var dt_prev;
    
    dt_prev = dt_ * N_;
    
    // Linear Backtracing here
    for(i = 1; i <= N_; i++)
    {
      for(j = 1; j <= N_; j++)
      {
        // Checking position where the the quantity has been one timestep bevore
        x = i - dt_prev * u[IX(i, j)];
        y = j - dt_prev * v[IX(i, j)];

        if(x < 0.5)
        {
          x = 0.5;
        }

        if(x > N_ + 0.5)
        {
          x = N_ + 0.5;
        }

        i0 = Math.floor(x);
        i1 = i0 + 1;

        if(y < 0.5)
        {
          y = 0.5;
        }

        if(y > N_ + 0.5)
        {
          y = N_ + 0.5;
        }

        j0 = Math.floor(y);
        j1 = j0 + 1;

        s1 = x - i0;
        s0 = 1 - s1;
        t1 = y - j0;
        t0 = 1 - t1;

        d[IX(i, j)] = s0 * (t0 * d_prev[IX(i0, j0)] + t1 * d_prev[IX(i0, j1)]) +
                      s1 * (t0 * d_prev[IX(i1, j0)] + t1 * d_prev[IX(i1, j1)]);
      }
    }
    
    setBoundary(b, d);
    
    help.x1 = d_prev;
  };
  
  var projection = function(u, v, p, div)
  {
    var i;
    var j;
    var brace;
    
    for(i = 1; i <= N_; i++)
    {
      for(j = 1; j <= N_; j++)
      {
        brace = u[IX(i + 1, j    )] - u[IX(i - 1, j    )] +
                v[IX(i,     j + 1)] - v[IX(i,     j - 1)];
        
        div[IX(i, j)] = -0.5 * brace / N_;
        p[IX(i, j)]   = 0;
      }
    }
    
    setBoundary(0, div);
    div = help.x0;
    
    setBoundary(0, p);
    p = help.x0;
    
    gaussSeidel(0, p, div, 1, 4);
    p   = help.x0;
    div = help.x1;
    
    for(i = 1; i <= N_; i++)
    {
      for(j = 1; j <= N_; j++)
      {
        u[IX(i, j)] -= 0.5 * N_ * (p[IX(i + 1, j    )] - p[IX(i - 1, j    )]);
        v[IX(i, j)] -= 0.5 * N_ * (p[IX(i,     j + 1)] - p[IX(i,     j - 1)]);
      }
    }
    
    setBoundary(1, u);
    u = help.x0;
    
    setBoundary(2, v);
    v = help.x0;
    
    help.x0 = u;
    help.x1 = p;
    help.x2 = v;
    help.x3 = div;
  };
  
  //----------------------------------------------------------------------------
  // Little helpers: private and public
  //----------------------------------------------------------------------------
  function IX(i, j)
  {
    return parseInt((i) + (N_ + 2) * (j));
  }
  
  this.REG_IX = function(i, j)
  {
    if(i < 1)
    {
      i = 1;
    }
    else if(i > N_)
    {
      i = N_;
    }
    
    if(j < 1)
    {
      j = 1;
    }
    else if(j > N_)
    {
      j = N_;
    }
    
    return IX(i, j);
  };

  this.NORM_IX = function(x, y)
  {
    var i = parseInt(x * (N_ + 2));
    var j = parseInt(y * (N_ + 2));
     
    return this.REG_IX(i, j);
  };
  //----------------------------------------------------------------------------
};
