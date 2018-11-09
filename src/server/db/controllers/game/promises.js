const db = require('../util/postgres');

/**
 * but for other games like sports, a card will only appear once in its category
 */
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
  return db.many(`SELECT c1.card_id, c1.card_name, 'MEDIUM' as answer
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
  return db.many(`SELECT c1.card_id, c1.card_name, 'HARD' as answer
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
module.exports = {

  loadGame(req, res, next) {
    console.log('body', req.body);
    const {
      game,
      query,
      level,
    } = req.body;
    db.many(`
          SELECT c.*
            FROM "game.dbo".cards_n c
              JOIN "game.dbo".game g 
                ON g.game_id = c.game_id
              WHERE g.game_name = $1 AND ($2:raw)  
              ORDER BY RANDOM()
              LIMIT 20;`, [game, query])
      .then((cards) => {
        res.locals.cards = cards;
        // eslint-disable-next-line array-callback-return
        return Promise.all(res.locals.cards.map((card) => {
          if (level === 'EASY') return easyAnswers(card.card_id, card.card_name);
          if (level === 'MEDIUM') return mediumAnswers(card.card_id, card.card_name);
          if (level === 'HARD') return hardAnswers(card.card_id, card.card_name);
        }));
      }).then((result) => {
        console.log(result);
        result.forEach((set, i) => {
          res.locals.cards[i].wrongAnswers = set;
        });
        res.json(res.locals.cards);
      })
      .catch(err => console.error(err));
  },
};