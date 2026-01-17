// Load a random quote from assets/movie-quotes.csv and place it in the footer
(function(){
  function isValidQuote(q){ return q && q.trim() && q.trim().toUpperCase() !== 'N/A'; }

  function escapeHtml(str){
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function placeQuote(textHtml){
    try{
      const el = document.querySelector('footer div');
      if(el){ el.innerHTML = textHtml; }
    }catch(e){ /* silent */ }
  }

  const QUOTES = [
    '"Warriors -- come out to play!" - Johnny, The Warriors',
    '"I am serious... and don\'t call me Shirley." - Dr. Rumack, Airplane!',
    '"It\'s just a flesh wound." - Black Knight, Monty Python and the Holy Grail',
    '"Inconceivable!" - Vizzini, The Princess Bride',
    '"Why so serious?" - The Joker, The Dark Knight',
    '"I\'m sorry, Dave. I\'m afraid I can\'t do that." - HAL 9000, 2001: A Space Odyssey',
    '"I\'ll be back." - The Terminator, The Terminator',
    '"Get three coffins ready." - The Man with No Name, A Fistful of Dollars',
    '"Game over, man! Game over!" - Hudson, Aliens',
    '"Today is the first day of the rest of your life." - Lester Burnham, American Beauty',
    '"This is my boomstick!" - Ash, Army of Darkness',
    '"We ride together, we die together." - Mike Lowrey, Bad Boys',
    '"Yes, I read you. The answer is negative." - Ripley, Alien',
    '"All those moments will be lost in time, like tears in rain. Time to die." - Roy Batty, Blade Runner',
    '"Enter freely of your own will, and leave some of the happiness you bring." - Count Dracula, Bram Stoker\'s Dracula',
    '"You ever dance with the devil in the pale moonlight?" - The Joker, Batman',
    '"E.T. phone home." - E.T., E.T. the Extra-Terrestrial',
    '"Crom!" - Conan, Conan the Barbarian',
    '"What is best in life?" - Mongol General, Conan the Barbarian',
    '"You ever feel like you\'re just alive?" - Frank Pierce, Bringing Out the Dead',
    '"I was quit when I came in here. I\'m twice as quit now." - Rick Deckard, Blade Runner',
    '"Hallelujah! Holy shit. Where\'s the Tylenol?" - Clark Griswold, Christmas Vacation',
    '"Welcome to the Carpathians. I am anxiously expecting you." - Count Dracula, Bram Stoker\'s Dracula',
    '"Oh, she is my dear, my darlin\' one..." - Michael McBride, Darby O\'Gill and the Little People',
    '"I should have known it. The rest of the world doesn\'t exist." - Francesco Dellamorte, Cemetery Man',
    '"Somebody put me back in the fridge" - John Spartan, Demolition Man',
    '"Your mother cheated. That\'s why you look like a plumber." - Bean, Enders Game',
    '"What was that? An exhibition? We need emotional content." - Lee, Enter the Dragon',
    '"Don\'t concentrate on the finger or you will miss all that heavenly glory." - Lee, Enter the Dragon',
    '"For God sakes, don\'t do it, Snake!" - Snake Plissken, Escape from L.A.',
    '"Look at her eyes! For God\'s sake, what happened to her eyes?" - Shelly, The Evil Dead',
    '"Well if you\'re Sean Archer, I guess I\'m Castor Troy." - Caster Troy, Face Off',
    '"What? No. We can\'t stop here. This is bat country." - Raoul Duke, Fear and Loathing in Las Vegas',
    '"No! Not the bore worms!" - Klytus, Flash Gordon",',
    '"Try and shoot me, Colonel. Just try." - El ndio, For a Few Dollars More',
    '"You shouldn\'t lose your temper, Charley. It isn\'t polite." - Peter Vincent, Fright Night',
    '"If there\'s a steady paycheck in it, I\'ll believe anything you say." - Winston Zeddemore, Ghostbusters',
    '"I got a record! I was \'Zero Cool\'!" - Dade Murphy, Hackers',
    '"There is no right and wrong. There\'s only fun and boring." - The Plague, Hackers',
    '"It\'s about building a new way of thinking." - Cameron Howe, Halt and Catch Fire',
    '"It\'s Halloween; everyone\'s entitled to one good scare." - Brackett, Halloween',
    '"Hey look, it\'s the douchebag from Karate Kid 3." - Jacob, Hot Tub Time Machine',
    '"Fortune and glory, kid. Fortune and glory." - Indiana Jones, Indiana Jones and the Last Crusade',
    '"It\'s not the years, honey, it\'s the mileage." - Indiana Jones, Indiana Jones and the Temple of Doom',
    '"No time for love, Dr. Jones! We\'ve got to escape!" - Short Round, Indiana Jones and the Temple of Doom',
    '"So we drink to our legs!" - Quint, Jaws',
    '"John is a man of focus, commitment, sheer will... something you know very little about." - Winston, John Wick',
    '"Drop... your weapons!" - Judge Dredd, Judge Dredd',
    '"No sequel for you..." - Jack Slater, Last Action Hero',
    '"The dreams of youth are the regrets of maturity." - Darkness, Legend',
    '"Is that you, John Wayne? Is this me?" - Joker, Full Metal Jacket',
    '"Oh, you\'re so COOL, Brewster!" - Evil, Fright Night',
    '"Rubber baby buggy bumpers!" - Jack Slater, Last Action Hero',
    '"I require the solace of the shadows and the dark of the night. Sunshine is my destroyer." - Darkness, Legend',
    '"Is life always this hard, or is it just when you\'re a kid?" - Mathilda, Léon the Professional',
    '"This is from... Mathilda." - Léon, Léon the Professional',
    '"Oh, Christ. That\'s what we are - spare parts." - Col. Jason Grant, Moontrap',
    '"We don\'t take no shit from machines!" - Ray Tanner, Moontrap',
    '"Gold and blood; they were Flint\'s trademarks." - Billy Bones, Muppet Treasure Island',
    '"Don\'t mess with the volcano, my man, cause I will go Pompeii on your... butt." - Mr. Furious, Mystery Men',
    '"The thing is, Bob, it\'s not that I\'m lazy, it\'s that I just don\'t care." - Peter, Office Space',
    '"You mean this? This is just a personal grooming appliance." - Riddick, Pitch Black',
    '"...if they knew that they were paying a federal agent to surf and pick up girls?" - Pappas, Point Break',
    '"Dead or alive, you\'re coming with me." - Robocop, Robocop.',
    '"I\'m Mok." - Mok, Rock & Rule',
    '"You are a heretic Dutchman pirate! You\'re going to die." - Father Sebastion, Shogun',
    '"Listen to me, you whore-gutted, pock-marked, motherless scum -- I need a favor." - Vasco Rodrigues',
    '"If anyone orders Merlot I am leaving." - Miles, Sideways',
    '"I HAVE HAD IT WITH THESE MOTHERFUCKIN\' SNAKES ON THIS MOTHERFUCKIN\' PLANE!" - Neville Flynn, Snakes on a Plane',
    '"Scientists are saying the future is going to be far more futuristic than they originally predicted." - Krysta Kapowski, Southland Tales',
    '"Oh, he can\'t stop it. There is no stopping wat can\'t be stopped. Only God can stop it." - Boxer Santaros, Southland Tales',
    '"Oh boy, the Shatner\'s really hit the fan now. I\'m up Dawson\'s Creek without a paddle." - Space Ghost, Space Ghost from Coast to Coast',
    '"Arr want\s your children!" - Maax, The Beast Master',
    '"Well, sir, it\'s this rug I had. It really tied the room together." - The Dude, The Big Lebowski',
    '"We\'re on a mission from God." - Jake and Elwood Blues, The Blues Brothers',
    '"I\'m an English teacher, not fucking Tomb Raider." - Juno, The Descent',
    '"I feel the need, the need for speed." - Maverick, Top Gun',
    '"People should not be afraid of their governments. Governments should be afraid of their people." - V, V for Vendetta',
    '"I drink your milkshake!" - Daniel Plainview, There Will be Blood',
    '"You are what you do. A man is defined by his actions, not his memory." - Quaid, Total Recall',
    '"You are like a giant cock-blocking robot, like developed in a secret government lab!" - Columbus, Zombieland',
    '"You won\t catch me dying. They\ll have to kill me before I die!" - Yellowbeard, Yellowbeard',
    '"My name\'s Bobby Peru, like the country." - Bobby Peru, Wild at Heart',
    '"The medicine cabinet is now the Brundle Museum of Natural History." - Seth Brundle, The Fly',
    '"Oh, you idiot. You glued it on upside down!" - Mikey, The Goonies',
    '"I didn\'t mean to step on your, uh, whatever that is." - Alex, The Last Starfighter',
    '"Do you know what it means when there\s no TV? No MTV." - Sam, The Lost Boys',
    '"Blockbuster Video. Des Moines, Iowa." - Wallace Ritchie, The Man who Knew Too Little',
    '"I only gamble with my life, never my money." - Rick, The Mummy',
    '"Braaaaains!" - So many zombies, Zombie Movies',
    '"To see the world, things dangerous to come to, to see behind walls, to draw closer, to find each other and to feel. That is the purpose of life." - Walter Mitty, The Secret Life of Walter Mitty',
    '"I drink your milkshake!" - Daniel Plainview, There Will Be Blood',
    '"I have come here to chew bubblegum and kick ass... and I\'m all out of bubblegum." - Nada, They Live',
    '"I gotta go Julia, we got cows." - Melissa, Twister',
    '"I feel the need, the need for speed!" - Maverick & Goose, Top Gun',
    '"The door opened, you got in." - Johnnycab, Total Recall',
    '"I\'ve been in the van for 15 years, Harry..." - Albert Gibson, True Lies',
    '"Oh hidy-ho officer, we\'ve had a doozy of a day." - Tucker, Tucker & Dale vs. Evil',
    '"I have become one. A vampire." - Peter Loew, Vampire\'s Kiss',
    '"Outstanding. Now, let\'s bite all their heads off, and pile them up in the corner." - Venom, Venom',
    '"Blue Horseshoe loves Anacott Steel." - Bud Fox, Wall Street',
    '"Were you rushing or were you dragging?" - Fletcher, Whiplash'
  ];

  function chooseAndPlace(){
    if(!Array.isArray(QUOTES) || QUOTES.length === 0) return;
    const pick = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    // pick is assumed to be the final display string; escape and place as HTML
    placeQuote(escapeHtml(pick));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chooseAndPlace);
  else chooseAndPlace();
})();
