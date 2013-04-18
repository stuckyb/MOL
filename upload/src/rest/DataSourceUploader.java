package rest;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;


public class DataSourceUploader
{
    private DataSourceMapping mapping;
    private String database, schema;
    private Connection pgdb, sldb;
    
    public DataSourceUploader(DataSourceMapping mapping, String sqlitedatapath) throws FileNotFoundException, IOException, SQLException {
        this.mapping = mapping;
        String propsfile = "uploadsettings.props";
        
        // Get the full path to the settings file.
        String pfpath = Thread.currentThread().getContextClassLoader().getResource(propsfile).getFile();
        
        // Attempt to load the Postgres DB settings file.
        Properties props = new Properties();
        FileInputStream in = new FileInputStream(pfpath);
        props.load(in);
        in.close();
        
        // Get the Postgres DB connection settings.
        String server = props.getProperty("pg_server");
        String tcp_port = props.getProperty("pg_server_tcp_port");
        database = props.getProperty("pg_db_name");
        schema = props.getProperty("pg_db_schema");
        String user = props.getProperty("pg_user");
        String password = props.getProperty("pg_pw");
        
        String connstr = "jdbc:postgresql://" + server + ":" + tcp_port + "/"
                + database;
        //System.out.println(connstr);

        // Connect to the PostgreSQL database.  Note that the JDBC driver is
        // loaded earlier by ContextListener.
        pgdb = DriverManager.getConnection(connstr, user, password);
        
        // Connect to the source SQLite database.
        connstr = "jdbc:sqlite:" + sqlitedatapath + mapping.datasource.dbfile;
        //System.out.println(connstr);
        sldb = DriverManager.getConnection(connstr);
    }
    
    public void uploadData() throws SQLException {
        Statement pgstmt = pgdb.createStatement();
        Statement slstmt = sldb.createStatement();
        
        // Get the source column names.
        String[] sourcecols = mapping.mapping.keySet().toArray(new String[0]);
        
        // Create a table for the data, dropping it first if it already exists.
        String query = "DROP TABLE IF EXISTS \"" + schema + "\".\"" + mapping.tablename + "\"";
        pgstmt.execute(query);
        
        query = "CREATE TABLE \"" + schema + "\".\"" + mapping.tablename + "\" (";
        int cnt = 0;
        for (String key : sourcecols) {
            if (cnt > 0)
                query += ", ";
            query += "\"" + mapping.mapping.get(key) + "\" text";
            cnt++;
        }
        query += ")";
        System.out.println(query);
        pgstmt.execute(query);
        
        // Generate a template for the PostgreSQL INSERT query, using the proper
        // column mappings.
        query = "INSERT INTO \"" + schema + "\".\"" + mapping.tablename + "\" (";
        cnt = 0;
        for (String key : sourcecols) {
            if (cnt > 0)
                query += ", ";
            query += "\"" + mapping.mapping.get(key) + "\"";
            cnt++;
        }
        query += ") VALUES (";
        for (cnt = 0; cnt < sourcecols.length; cnt++) {
            if (cnt > 0)
                query += ", ";
            query += "?";
        }
        query += ")";
        System.out.println(query);
        
        // Create a PreparedStatement for the PostgreSQL INSERT query.
        PreparedStatement pstmt = pgdb.prepareStatement(query);

        // Build the query to retrieve the data from the source SQLite database.
        query = "SELECT ";
        cnt = 0;
        for (String column : sourcecols) {
            if (cnt > 0)
                query += ", ";
            query += "\"" + column + "\"";
            cnt++;
        }
        query += " FROM \"" + mapping.tablename + "\"";
        System.out.println(query);
        
        // Execute the query and process the results.
        ResultSet slrs = slstmt.executeQuery(query);
        while (slrs.next()) {
            // Update the PreparedStatement with the retrieved values.
            for (cnt = 1; cnt <= sourcecols.length; cnt++) {
                pstmt.setString(cnt, slrs.getString(cnt));
            }
            
            pstmt.addBatch();
        }
        
        // Run the queued INSERT queries.
        pstmt.executeBatch();
        
        pgstmt.close();
        slstmt.close();
    }
    
    public void close() throws SQLException {
        pgdb.close();
        sldb.close();
    }
}
