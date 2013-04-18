package rest;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;

/**
 * Represents a table in a database.
 */
public class DatabaseTable {
    private int nrows = 10;
    public String name;
    public ArrayList<String> columns;
    public ArrayList<ArrayList> data;

    /**
     * For construction from JSON.
     */
    DatabaseTable() {}
    
    /**
     * Construct the new DatabaseTable.  Expects a valid connection to a source
     * SQLite database and a valid table name in that database.  Inspects the
     * source database to determine the column names of the target table, then
     * retrieves the first rows of data from the table.
     * 
     * @param sqliteconn A connection to a SQLite database.
     * @param name A valid table name in the database.
     * @throws SQLException 
     */
    DatabaseTable(Connection sqliteconn, String name) throws SQLException {
        ResultSet rs;
        int numcols, cnt;
        Statement stmt = sqliteconn.createStatement();
        
        this.name = name;
        this.columns = new ArrayList<String>();
            
        // Get the column names.
        rs = stmt.executeQuery("PRAGMA table_info('" + name + "')");
        while (rs.next()) {
            columns.add(rs.getString("name"));
        }
        numcols = columns.size();
        
        // Get the first nrows rows of table data.
        // First, build the appropriate SQL query.
        data = new ArrayList<ArrayList>();
        String query = "SELECT ";
        cnt = 0;
        for (String column : columns) {
            if (cnt > 0)
                query += ", ";
            query += "\"" + column + "\"";
            cnt++;
        }
        query += " FROM \"" + name + "\" LIMIT " + nrows;
        System.out.println(query);
        
        // Execute the query and process the results.
        rs = stmt.executeQuery(query);
        ArrayList<String> row;
        while (rs.next()) {
            row = new ArrayList<String>();
            for (cnt = 1; cnt <= numcols; cnt++)
                row.add(rs.getString(cnt));
            
            data.add(row);
        }
        
        stmt.close();
    }
}
