import * as pg from 'pg';

function generateRange(len) {
    return [...Array(len).keys()];
}

let client = null;

export function initDatabase() {
    let connectionString = process.env.DATABASE_URL;

    let Client = pg.default.Client;
    client = new Client({connectionString});
    client.connect();

    /*let testTable = new Table('testtable', {
        id: {
            type: 'SERIAL',
            primaryKey: true,
        },
        firstname: {
            type: 'TEXT',
        },
        lastname: {
            type: 'TEXT',
        },
    });*/
}

class Table {
    constructor(id, columnInfos) {
        this.id = id;
        this.columnInfos = columnInfos;
    }

    getPrimaryKey() {
        return Object.keys(this.columnInfos)
            .filter(columnName => this.columnInfos[columnName])[0];
    }

    create() {
        let generateColumnExpression = colName => {
            let columnInfo = this.columnInfos[colName];
            let expression = `${colName} ${columnInfo.type}`;

            if(columnInfo.primaryKey)
                expression += ` PRIMARY KEY`;

            if(!columnInfo.allowNulls)
                expression += ` NOT NULL`;

            return expression;
        }

        let columnExpression = Object.keys(this.columnInfos)
            .map(colName => generateColumnExpression(colName))
            .join(', ');

        let statement = `CREATE TABLE ${this.id} (${columnExpression})`;

        return new Promise((resolve, reject) => {
            client.query(statement, (error, res) => {
                if(error) {
                    reject(error);
                    return;
                }

                resolve(res);
            });
        });
    }

    //TODO: drop()
    drop() {
        return client.query(`DROP TABLE ${this.id}`);
    }

    select(conditions) {
        let statement = `SELECT * from ${this.id}`;

        if(conditions != null && conditions.length != 0)
            statement += `WHERE ${conditions}`;

        return new Promise((resolve, reject) => {
            client.query(statement, (error, res) => {
                if(error) {
                    reject(error);
                    return;
                }

                resolve(res.rows);
            });
        });
    }

    //TODO: Support inserting multiple rows with a single query.
    insert(object, isUpsert) {
        let fields = Object.keys(this.columnInfos)
            .map(columnName => ({
                name: columnName,
                value: object[columnName],
                info: this.columnInfos[columnName]
            })).filter(field => !(field.value == null && field.info.type == 'SERIAL'));

        let fieldNames = fields.map(field => field.name);
        let fieldValues = fields.map(field => field.value);
        let paramTokens = generateRange(fields.length).map(i => `$${i + 1}`).join(', ');
        let queryString = `INSERT INTO ${this.id} (${fieldNames.join(', ')}) VALUES (${paramTokens})`;
        let primaryKey = this.getPrimaryKey();

        if(isUpsert && primaryKey != null) {
            queryString += ` ON CONFLICT (${primaryKey}) DO UPDATE SET `;

            queryString += fieldNames
                .filter(name => name != primaryKey)
                .map(name => `${name} = EXCLUDED.${name}`)
                .join(', ');
        }

        if(primaryKey != null)
            queryString += ` RETURNING ${primaryKey}`;

        queryString += ';';

        return client.query(queryString, fieldValues).then(res => {
            console.log({insertResult: res});
            return res;
        });
    }
}
