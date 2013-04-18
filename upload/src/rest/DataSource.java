package rest;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;


/**
 * Represents a complete data source, including the names of relevant files and
 * the structure of the data.
 */
public class DataSource
{
    public String datetime;
    public String source_fname;
    public List<DataOwner> owners;
    public String keywords;
    public String license;
    public String embargo;
    public String dbfile;
    public ArrayList<DatabaseTable> tables;
    
    /**
     * For construction from JSON.
     */
    DataSource() {}
    
    public DataSource(File sqlitefile, String source_fname,
            List<DataOwner> owners, String keywords, String license,
            String embargo)
            throws SQLException, ClassNotFoundException {
        Connection dbconn;
        Statement stmt;
        String query;
        // A list for temporarily storing the table names.
        ArrayList<String> tablenames;

        this.owners = owners;
        this.keywords = keywords;
        this.license = license;
        this.embargo = embargo;
        datetime = DateFormat.getDateTimeInstance().format(new Date());
        this.source_fname = source_fname;
        dbfile = sqlitefile.getName();

        // Load the Sqlite JDBC driver.
        Class.forName("org.sqlite.JDBC");

        // Create the SQLite JBDC connection.
        String connstr = "jdbc:sqlite:" + sqlitefile.getAbsolutePath().replace("\\", "/");
        //System.out.println(connstr);
        dbconn = DriverManager.getConnection(connstr);
        stmt = dbconn.createStatement();
        
        // Get the table names from the database.
        tablenames = new ArrayList<String>();
        query = "SELECT name FROM sqlite_master WHERE type='table'";
        ResultSet rs = stmt.executeQuery(query);
        String tablename = "";
        while (rs.next()) {
            tablename = rs.getString(1);
            tablenames.add(tablename);
        }
        
        // Process each table name, creating a DataBase table object for each.
        tables = new ArrayList<DatabaseTable>();
        DatabaseTable dbtable;
        for (String tname : tablenames) {
            System.out.println(tname);
            dbtable = new DatabaseTable(dbconn, tname);
            tables.add(dbtable);
        }
        
        stmt.close();
    }
}
