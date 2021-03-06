const db = require('../util/postgres');

/**
 * but for other games like sports, a card will only appear once in its category
 */
function loadGameNoYears(game, query) {
  return db.many(`
                SELECT c.*
                FROM "game.dbo".cards_n c
                  JOIN "game.dbo".game g 
                    ON g.game_id = c.game_id
                WHERE g.game_name = $1 AND ($2:raw)  
                ORDER BY RANDOM()
                LIMIT 20;`, [game, query])
    .catch(err => console.error(err));
}

function loadGameWithYears(game, query, startDate, endDate) {
  console.log('in here man');
  return db.many(`
                SELECT c.*
                FROM "game.dbo".cards_n c
                  JOIN "game.dbo".game g 
                    ON g.game_id = c.game_id
                WHERE g.game_name = $1 AND ($2:raw)  
                AND (CAST(category_b as bigint) between $3 and $4)
                ORDER BY RANDOM()
                LIMIT 20;`, [game, query, startDate, endDate])
    .catch(err => console.error(err));
}


function easyAnswers(id, name) {
  return db.many(`        
          SELECT c1.card_id, c1.card_name, 'EASY' as answer
          FROM "game.dbo".cards_n c
            JOIN "game.dbo".cards_n c1
              ON c.card_category = c1.card_category 
              AND c1.card_id <> $1
              AND c1.card_name <> $2
          WHERE c.card_id = $1
          ORDER BY RANDOM()
          LIMIT 3;
          `, [id, name])
    .catch(err => console.error(err));
}

function mediumAnswers(id, name) {
  return db.many(`
          SELECT c1.card_id, c1.card_name, 'MEDIUM' as answer
          FROM "game.dbo".cards_n c
          JOIN "game.dbo".cards_n c1
            ON c.card_category = c1.card_category 
            AND c.category_a = c1.category_a 
            AND c1.card_id <> $1
            AND c1.card_name <> $2
          WHERE c.card_id = $1
          ORDER BY RANDOM()
          LIMIT 3;`, [id, name])
    .catch(err => console.error(err));
}

function hardAnswers(id, name) {
  return db.many(`
          SELECT c1.card_id, c1.card_name, 'HARD' as answer
          FROM "game.dbo".cards_n c
          JOIN "game.dbo".cards_n c1
            ON c.card_category = c1.card_category 
              AND c.category_a = c1.category_a 
              AND c.category_b = c1.category_b
              AND c1.card_id <> $1
              AND c1.card_name <> $2
          WHERE c.card_id = $1
          ORDER BY RANDOM()
          LIMIT 3;`, [id, name])
    .catch(err => console.error(err));
}

function yearHardAnswers(id, name) {
  return db.many(`
          SELECT c1.card_id, c1.card_name, 'HARD' as answer
          FROM "game.dbo".cards_n c
          JOIN "game.dbo".cards_n c1
            ON c.card_category = c1.card_category 
              AND c.category_a = c1.category_a 
              AND cast(c1.category_b as bigint) between  cast(c.category_b as bigint)-3 and cast(c.category_b as bigint)+3
              AND c1.card_id <> $1
              AND c1.card_name <> $2
          WHERE c.card_id = $1 AND c.game_id = 1
          ORDER BY RANDOM()
          LIMIT 3;`, [id, name])
    .catch(err => console.error(err));
}

module.exports = {

  loadGame(req, res) {
    console.log('body', req.body);
    const {
      game,
      query,
      level,
      years,
      startDate,
      endDate,
    } = req.body;

    let prom;

    if (years === true) prom = loadGameWithYears(game, query, startDate, endDate);

    if (years === false) prom = loadGameNoYears(game, query);
    // // eslint-disable-next-line no-return-await
    // return loadGameNoYears(game, query)
    prom.then((cards) => {
      console.log('years ', years);
      res.locals.cards = cards;
      // eslint-disable-next-line array-callback-return
      return Promise.all(res.locals.cards.map((card) => {
        if (level === 'EASY') return easyAnswers(card.card_id, card.card_name);
        if (level === 'MEDIUM') return mediumAnswers(card.card_id, card.card_name);
        if (level === 'HARD' && years) return yearHardAnswers(card.card_id, card.card_name);
        if (level === 'HARD') return hardAnswers(card.card_id, card.card_name);
      }));
    })
      .then((result) => {
        console.log(result);
        result.forEach((set, i) => {
          res.locals.cards[i].wrongAnswers = set;
        });
        res.json(res.locals.cards);
      })
      .catch(err => console.error(err));
  },


  saveScore(req, res) {
    const {
      username,
      game,
      level,
      score,
    } = req.body;
    db.none('INSERT INTO "game.dbo".player_history("user", "game", "difficulty_level", "score") VALUES($1,$2,$3,$4)', [username, game, level, score])
      .then(() => {
        res.send('score recorded');
      })
      .catch(err => console.error(err));
  },

  leaderBoard(req, res) {
    const {
      game,
    } = req.body;
    console.log('req bod ', req.body);
    console.log('game in leaderboard control ', game);

    db.query(`SELECT "user", game, coalesce(difficulty_level, 'ALL') as difficulty_level, sum(score) sum, avg(score) avg, count (*) gamecount
              FROM "game.dbo".player_history 
              WHERE "game" = $1
              GROUP BY GROUPING SETS (("user", game), ("user",game, difficulty_level));`,
    [game])
      .then((data) => {
        console.log('leaderboard data', data);
        return res.json(data);
      })
      .catch(err => console.error(err));
  },
};
