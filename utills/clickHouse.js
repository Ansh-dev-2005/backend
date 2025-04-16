import { createClient } from "@clickhouse/client"


export const clickhouseClient = async (url, username, password) => {
    try{
    const client = createClient({
        url: url,
        username: username,
        password: password,
    });

    const rows = await client.query({
        query: 'SELECT 1',
        format: 'JSONEachRow',
    })
    console.log('Result: ', await rows.json());
    return client;
    }
    catch(err){
        console.error('Connection failed:', err.message);
        return null;
    }
    }

