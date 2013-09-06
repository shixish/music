var delay = 0; // play note right away
var length = 0.75;
var velocity = 127; // how hard the note hits
var num_keys = 88;
var default_octave = 3;
var tempo = 120;//beats per minute
var beat_length = 1000/(tempo/60);
MIDI.key_range = [MIDI.pianoKeyOffset, MIDI.pianoKeyOffset+num_keys-1];//MIDI note range that we have sounds for is 21 to 108

(function($){
  var $body = $(document.body), $piano = $('#piano', $body), $controls = $('#controls', $body);
  var piano, progression;
  
  var init = function(){
    piano = new Piano($piano[0]);
    
    window.scale = new Scale();
    //window.scale = Scale.generate();
    //window.scale = new Scale({tonic: 8, type: "Major"})
    //window.scale = new Scale({tonic: 0, type: "Major"})
    //window.scale = new Scale({tonic: 1, type: "Minor"})
    //
    
    var changeScale = function(){
      window.scale = Scale.generate();
    }
    
    var $currentScale = $('<span>').html(window.scale.toString()).appendTo($('<div>').append('<b>Current Scale:</b> ').appendTo($controls));
    var $newScale = $('<button>').html('New Scale').appendTo($controls).click(function(e){
      window.scale = Scale.generate();
      $currentScale.html(window.scale.toString());
    });
    
    var $play = $('<button>').html('Play Something').appendTo($controls).click(function(e){
      progression = new Progression(scale, 3).generate();
      progression.play();
    });
  }
  
  window.Scale = function(_options){
    var options = _options||{};
    this.tonic = options.tonic!=undefined?options.tonic:0;
    this.type = options.type||'Major';
    this.notes = [];
    octave_breakpoint = 0;
    
    var _this = this;//stupid scoping...
    var parse_pattern = function(steps){
      var chroma = _this.tonic;
      _this.notes = [];
      for (var s in steps){
        _this.notes[s] = chroma;
        chroma += parseInt(steps[s]);
        if (chroma > 11){
          chroma -= 12;
          octave_breakpoint = s;
        }
        //chroma = step(chroma, parseInt(steps[s]));
      }
    }
    
    function step(p, s){
      var r = p+s;
      if (r > 11)
        return r-12;
      else
        return r;
    }
    
    //var stepper = this.tonic;
    switch (this.type){
      case 'Major':
        parse_pattern([2, 2, 1, 2, 2, 2, 1]);
        break;
      case 'Minor':
        parse_pattern([2, 1, 2, 2, 1, 2, 2]);
        break;
    }
    
    this.getNote = function(_id, _octave, _duration){
      var id = _id!=undefined?_id:0;
      var octave = _octave!=undefined?parseInt(_octave):default_octave;
      var duration = _duration>0?_duration:1;
      var note_count = this.notes.length;
      //if (id >= note_count || id < 0){
        octave += Math.floor(id/note_count);
        id = Math.abs(id%note_count);
        if (id > octave_breakpoint){
          octave++;
        }
      //}
      return Note.generate({chroma:this.notes[id], octave:octave, duration:duration});
    }
    
    this.getChord = function(_id, _octave, _duration){
      var id = _id!=undefined?parseInt(_id):0;
      //return new Chord([this.getNote(id, _octave), this.getNote(id+2, _octave), this.getNote(id+4, _octave)]);
      quality = Scale.chord_qualities[this.type][id];
      return new Chord(this.getNote(id, _octave, _duration), quality);
    }
  }
  //see: http://musictheoryblog.blogspot.com/2007/01/minor-scales.html
  window.Scale.scales = {
    'Major': [2, 2, 1, 2, 2, 2, 1],
    'Minor': [2, 1, 2, 2, 1, 2, 2],
    'HMinor': [2, 1, 2, 2, 1, 3, 1],
    'MMinor': [2, 1, 2, 2, 2, 2, 1],//This is the ascending scale, decending you use natural minor...
  };
  //See: http://musictheory.alcorn.edu/Version2/theory1/Roman.htm
  window.Scale.chord_qualities = {
    'Major':['Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished'],
    'Minor':['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major'],//'Major', 'Major', 'Diminished'],//natural minor
    'HMinor':['Minor', 'Diminished', 'Augmented', 'Minor', 'Major7', 'Major', 'Diminished'],
    'MMinor':['Minor', 'Minor', 'Augmented', 'Major', 'Major', 'Diminished', 'Diminished'],
  };
  window.Scale.tonic_map = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  //http://www.tsmp.org/theory/lias/pdf/quickfacts.pdf
  //I ii iii IV V vi vii°
  window.Scale.generate = function(){
    var tonic = Math.round(Math.random()*11);
    var type = Math.round(Math.random())?"Major":"Minor";
    return new Scale({tonic:tonic, type:type});
  }
  window.Scale.prototype.toString = function(){
    return Scale.tonic_map[this.tonic] + ' ' + this.type;
  }
  
  window.Chord = function(_root, _quality){
    this.setQuality = function(_quality){
      his.quality = Chord.quality_map[_quality]?_quality:'Major';
      this.reset.call(this);
    }
    
    this.add = function(_interval){
      var step = this.getStepSize(_interval);
      if (step >= 0)
        this.notes.push([1, new Note(this.root.note()+step)]);//Major7 is 11 steps
      return this;
    }
    
    this.remove = function(_id){
      if (_id == undefined) {
        if (Math.random.flip())//reduce the changes of it deleting something
          return this;
        _id = Math.random.range(0, this.notes.length-1);
      }
      this.notes.splice(_id, 1);
      return this;
    }
    
    this.getStepSize = function(_interval){
      var split = /([mMdAP])([0-9]+)/.exec(_interval)
      var interval_digit = split.pop(), interval_quality = split.pop();
      var octave_multiplier = 0;
      if (interval_digit > 7){
        octave_multiplier = Math.floor(interval_digit/7);
        interval_digit %= 7;
      }
      var ret = Chord.interval_map[interval_quality+interval_digit];
      if (ret >= 0){
        return ret+octave_multiplier*12;
      }else{
        console.log(_interval+' is not a valid interval!');
        return FALSE;
      }
    }
    
    this.invertUp = function(){
      var note_array = this.notes.shift();
      //0 is the start timing, 1 is the actual note
      note_array[1].octaveUp();
      this.notes.push(note_array);
    }
    
    this.invertDown = function(){
      var note_array = this.notes.pop();
      //0 is the start timing, 1 is the actual note
      note_array[1].octaveDown();
      this.notes.unshift(note_array);
    }
    
    this.invert = function(type, n){
      if (n == undefined) n = 1;
      else n = parseInt(n);
      switch (type){
        case 'up':
          for (var i = 0; i<n;i++) this.invertUp();
          break;
        case 'down':
          for (var i = 0; i<n;i++) this.invertDown();
          break;
        default:
          for (var i = 0; i<n;i++){
            switch(Math.random.range(0, 2)){
              case 0: 
                this.invertUp();
              case 1:
                this.invertDown();
            }
          }
          break;
      }
      return this;
    }
    
    this.contract = function(amount){
      for (var n in this.notes){
        this.notes[n][1].contract(amount);
      }
      return this;
    }
    
    this.extend = function(amount){
      for (var n in this.notes){
        this.notes[n][1].extend(amount);
      }
      return this;
    }
    
    this.play = function(){
      for (var n in this.notes){
        (function(start, note){
          setTimeout(function(){
            note.play();
          }, start);
        })(this.notes[n][0]*beat_length, this.notes[n][1]);
      }
    }
    
    this.reset = function(){
      var pattern;
      if (Chord.quality_map[this.quality]){
        pattern = Chord.quality_map[this.quality];
      }else{
        pattern = Chord.quality_map['Major'];
      }
      for (var i in pattern){
        var step = this.getStepSize(pattern[i]);
        if (step == 0){
          this.notes.push([0, this.root]);
        }else{
          this.notes.push([0, new Note(this.root.note()+step, duration)]);
        }
      }
    }
    
    this.arpeggiate = function(amount){
      amount = amount>0?amount:1;
      for (var i in this.notes){
        this.notes[i][0] += i*amount;
      }
      return this;
    }
    
    //
    //Initialize
    //
    
    //var options = _options||{};
    this.root = _root || new Note(60); //middle C
    this.quality = Chord.quality_map[_quality]?_quality:'Major';
    var duration = this.root.duration();
    //this.chromas = [_scale.note[this.root]];
    this.notes = [];
    
    this.reset.call(this);
  }
  window.Chord.generate = function(){
    
  }
  window.Chord.quality_map = {'Major': ['P1', 'M3', 'P5'], 'Minor': ['P1', 'm3', 'P5'], 'Diminished': ['P1', 'm3', 'd5'], 'Augmented': ['P1', 'M3', 'A5']};
  window.Chord.interval_map = {
    'P1':0,'A1':1,
    'd2':0,'m2':1,'M2':2,'A2':3,
    'd3':2,'m3':3,'M3':4,'A3':5,
    'd4':4,'P4':5,'A4':6,
    'd5':6,'P5':7,'A5':8,
    'd6':7,'m6':8,'M6':9,'A6':10,
    'd7':9,'m7':10,'M7':11,'A7':12,
    'd8':11,'P8':12
  };
  window.Chord.prototype.toString = function(){
    var ret = this.root + ' ' + this.quality + ' chord (';
    for (var i in this.notes){
      if (i != 0)
        ret += ', ';
      ret += this.notes[i].name();
    }
    ret += ')';
    return ret;
  }
  
  window.Composition = function(){
    
  }
  
  window.motif = function(){
    
  }
  
  window.Progression = function(_scale, _octave){
    this.scale = _scale;
    this.octave = _octave!=undefined?parseInt(_octave):default_octave;
    this.progression = [];
    //this.bpm = 4; //beats per measure
    //this.progression.push([0, scale.getChord(0, this.octave, 1)]);
    //this.progression.push([1, scale.getChord(0, this.octave, .25)]);
    //this.progression.push([1.30, scale.getChord(0, this.octave, .75)]);
    //this.progression.push([2, scale.getChord(2, this.octave, 1)]);
    //this.progression.push([3, scale.getChord(1, this.octave, 1)]);
    //this.progression.push([4, scale.getChord(4, this.octave, 1)]);
    //this.progression.push([5, scale.getChord(5, this.octave, 1)]);
    //this.progression.push([6, scale.getChord(0, this.octave+1, 3)]);
    
    this.generate = function(type){
      this.progression = [];
      var total_notes = 8;
      for (var i = 0; i<total_notes; i++){
        var tonic = (i+1 == total_notes)?0:Math.floor(Math.random()*8);//always end on the tonic
        var high1 = scale.getChord(tonic, this.octave+2, 1).contract(.5).arpeggiate(.33).invert().remove();
        var high2 = scale.getChord(tonic, this.octave+2, 1).contract(.5).arpeggiate(.33).invert().remove();
        var low = scale.getChord(tonic, this.octave, 1).extend();
        this.progression.push([i*2+1, high1]);
        this.progression.push([i*2, high2]);
        this.progression.push([i*2, low]);
      }
      return this;
    }
    
    this.demo = function(){
      this.progression = [];
      for (var i = 0; i<8; i++){
        this.progression.push([i, scale.getChord(i, this.octave, 1)]);//tonic, octave, length
      }
      return this;
    }
    
    this.play = function(){
      //var pos = 0, len = this.progression.length;
      //var player = function(){
      //  var chord = this.progression[pos][0], length = this.progression[pos][1]*beat_length;
      //  console.log(this.progression[pos], chord);
      //  if (chord) chord.play(length);
      //  if (++pos < len) setTimeout(player, length);
      //}
      ////player();
      //player.call(this);
      for (var p in this.progression){
        (function(start, chord){
          setTimeout(function(){
            chord.play();
          }, start);
        })(this.progression[p][0]*beat_length, this.progression[p][1]);
      }
    }
  }
  
  //for (var i = 0; i<15; i++){
  //  console.log(Math.floor(i/4), Math.floor(i%4));
  //}
  
  window.Note = function(_note, _duration){
    var note = parseInt(_note);
    var chroma = note%12;
    var octave = Math.floor(note/12);
    var duration = _duration||1;
    
    this.isBlack = function(){
      if (chroma == 1 || chroma == 3 || chroma == 6 || chroma == 8 || chroma == 10){
        return true;
      }else{
        return false;
      }
    }
    this.isWhite = function(){
      if (chroma == 0 || chroma == 2 || chroma == 4 || chroma == 5 || chroma == 7 || chroma == 9 || chroma == 11){
        return true;
      }else{
        return false;
      }
    }
    this.name = function(){
      return MIDI.noteToKey[note];
    }
    this.duration = function (_duration){
      if (_duration){
        duration = _duration;
        return this;
      }else
        return duration;
    }
    this.extend = function(amount){
      amount = (amount == undefined)?1:parseInt(amount);
      duration += amount;
      return this;
    }
    this.contract = function(amount){
      amount = (amount == undefined)?1:parseInt(amount);
      duration -= amount;
      return this;
    }
    this.octave = function (_octave){
      if (_octave){
        octave = parseInt(_octave);
        note = octave*12+chroma;
        return this;
      }else
        return octave;
    }
    this.octaveUp = function(){
      this.octave(octave+1);
      return this;
    }
    this.octaveDown = function(){
      this.octave(octave-1);
      return this;
    }
    this.note = function(_note){
      if (_note){
        note = parseInt(_note);
        chroma = note%12;
        octave = Math.floor(note/12);
        return this;
      }else
        return note;
    }
    this.chroma = function(_chroma){
      if (_chroma){
        chroma = parseInt(_chroma);
        note = octave*12+chroma;
        return this;
      }else
        return chroma;
    }
    this.clone = function(){
      return new Note(note);
    }
    this.play = function(){
      //length = length || tempo;//play for a whole measure
      var length = (duration*beat_length)/1000;
      if (MIDI.api){
        MIDI.noteOn(0, note, velocity);
        MIDI.noteOff(0, note, length);
        if (piano && piano.keys[note]) piano.keys[note].flash();
      }else{
        console.log('Can\'t play this note yet, not fully loaded.');
      }
    }
  }
  //window.Note.chroma_key = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  window.Note.prototype.toString = function(){
    return this.name();
  }
  window.Note.generate = function(_options){
    var octave_range = [Math.floor(MIDI.key_range[0]/12), Math.ceil(MIDI.key_range[1]/12)];
    var options = _options||{};
    var chroma = options.chroma>=0?options.chroma:Math.round(Math.random()*11);
    var octave = options.octave>=0?options.octave:Math.round(Math.random()*(octave_range[1]-octave_range[0])+octave_range[0]);
    var duration = options.duration>0?options.duration:1;
    var note = octave*12+chroma;
    if (note > MIDI.key_range[0] && note < MIDI.key_range[1]){
      return new Note(note, duration);
    }else if (options.tries > 4){
      options.tries++;
      return Note.generate(options);//if its not within the range just try again...
    }else{
      return Note.generate();//if something invalid happend, just make something up
    }
    //var note = Math.round(Math.random()*(MIDI.key_range[1]-MIDI.key_range[0])+MIDI.key_range[0]); 
  }
  
  window.Piano = function(element, _options){
    var options = _options||{};
    var key_width = options.key_width||23;
    var black_key_width = options.black_key_width||13;
    var black_key_shift = black_key_width/2;
    
    var Key = function(_note, x){
      this.note = _note;
      var is_white = _note.isWhite();
      var key_color = is_white?'#fff':'#000';
      var rect;//Paper.rect(x, y, width, height, [r])
      
      if (is_white){//white key
        rect = paper.rect(x, 0, key_width, 120).toBack();//move it behind the black keys
      }else{//black key
        rect = paper.rect(x-black_key_shift, 0, black_key_width, 80);
      }
      rect.attr("fill", key_color);
      
      this.flash = function(d){
        var duration = d||1e2;
        var return_color = key_color, new_color = is_white?'#ee0':'#cc0';
        rect.animate({ fill: new_color }, duration, function(){
          rect.animate({ fill: return_color }, duration*4);
        });
      }
      
      var _this = this;
      rect.mousedown(function (e){
        _note.play();
        _this.flash();
      });
      
      rect.mouseover(function(e){
        var new_color = is_white?'#7d7':'#090'
        rect.animate({ fill: new_color }, 1e2);
      });
      
      rect.mouseout(function(e){
        rect.animate({ fill: key_color }, 1e2);
      });
    }
    
    //initialize the piano:
    var paper = Raphael(element, key_width*52, 120);//x,y,w,h
    this.keys = {};
    
    var num = 0;
    for (var i = MIDI.key_range[0]; i<MIDI.key_range[1]; i++){
      var note = new Note(i);
      var key = new Key(note, key_width*num);
      this.keys[i] = key;
      if (note.isWhite())//only increment when it's a white key
        num++;
    }
  }
  
  //This article talks about the MIDI standard for representing notes (0-127).
  // http://en.wikipedia.org/wiki/Pitch_classes
  
  MIDI.loader = new widgets.Loader;
  MIDI.loadPlugin({
    soundfontUrl: "./soundfont/",
    instrument: "acoustic_grand_piano",
    callback: function() {
      MIDI.loader.stop();
      MIDI.setVolume(0, 127);
      init();
    }
  });
  
  window.Math.random.flip = function(){
    return Math.floor(Math.random()*2);
  }
  window.Math.random.range = function(){
    var min = 0, max = 1;
    switch (arguments.length){
      case 2:
        min = arguments[0];
        max = arguments[1];
        break;
      case 1:
        min = 0;
        max = arguments[0];
        break;
    }
    return min + Math.round(Math.random()*(max-min));
  }
  
})(jQuery);