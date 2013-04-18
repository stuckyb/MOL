package rest;

import java.util.Map;


public class DataSourceMapping
{
    public DataSource datasource;
    public String tablename;
    public Map<String, String> mapping;
    
    /**
     * For construction from JSON.
     */
    DataSourceMapping() {}
}
