A plan for validating taxon names.

TNRS = Taxonomic Name Resolution Service.

1. bulkloader/tnrs_ingest: This folder will contain code to update TNRS databases on in a single
table in CartoDB. The plan is to set up the simplest table that we can use to figure out the
validity of names. Since TNRSes tend to be pretty small, we should really be doing this in its
own SQLite database, but CartoDB is easier because (1) it's already a big part of Map of Life,
and (2) we might be able to use PostgreSQL's built-in full-text search to fuzzy-match taxon 
names.

Changes in layer_metadata:
    scientificname ->   verbatim_scname
    tnrs_id (string) -> The tnrs_id of the tnrs_names table.
    (? do we need the accepted_tnrs_id cached here? If so, a script to check this would be 
    helpful!)

Do we need this?
    tnrs_notes (string)
    

A proposed schema for the tnrs_names table:

    id              (primary key integer)
    tnrs_id         (string unique indexed) The identifier used to identify this field in the TNRS.
                    e.g. "ITIS:180144"
    interpreted_scname  (string indexed not unique) The taxon name.
                    e.g. "Eutamias minimus"
    accepted_tnrs_id (string indexed ref:tnrs_id on delete throw error) The currently accepted name.
                    e.g. "ITIS:180195"
                    If NULL, then interpreted_tnrs_id is the accepted_tnrs_id.
    sensu           (string default "") In what sense is this taxon name being used?
                    e.g. "Authority: (Bachman, 1839)"
    tnrs_version    (string) The version string of the TNRS being used.
                    e.g. "ITIS download as of Jun 27, 2012"
    url             (string) A resolvable URL which corresponds to the TNRS id.
    note            (string) Enter a note.

Do we need this?
    child_of        (string not null ref:tnrs_id on delete throw error) The parent taxon.
                    Species --(child_of)--> Genus --(child_of)--> Family ...
                    This is very basic functionality, which we primarily use to
                        (1) Display the 

A proposed schema for the tnrs_splits table:

    id              (primary key integer)
    tnrs_id         (string unique indexed) The identifier used to identify this field in the TNRS.
                    e.g. "ITIS:180144"
    split_from
    lumped_to
    

2. Validate existing names. This will be carried out with the following algorithm:

    1. For every name, 
        1. search for a corresponding name_string in the TNRS table.
        2. If there is a perfect match, add the tnrs_id to the interpreted_tnrs_id in the 
            layer_metadata table.
    2. As of Sep 19, 2012, there will be 27,951 names which will not match ITIS. Most of
        these are in GBIF Nub, though, so if we could get our hands on that, we should be
        good for the data we currently have.
    3. The remaining names can be used to test/write the name vetting code. Note that no
        "sensu" information is necessary.

3. An interactive program to vet incoming names in a CartoDB. Initially, this will be
    tested by looking at the names in layer_metadata; future uploads could just put
    the names into layer_metadata using other workflows, and then these will be validated
    by this program.

    1. User is asked to select a source. At this stage, numbers of validation required for
        each source are displayed. The user can opt to list names from ALL sources.

    2. For every unique name in layer_metadata where source=provided_source and tnrs_id=NULL:
        1. Display the name to the user, along with the associated layer.
        2. Search the closest match(es) to the TNRS. Use Taxamatch (see
            https://github.com/GlobalNamesArchitecture/taxamatch_rb), in which case we'd 
            have to preparse names, which we can do.
        3. The user gets four options:
            1. This is a typo of a name already in the database.
                Set layer_metadata.tnrs_id to the selected name.
            2. One of the matches or a new name is a synonym of this name. 
                The user will need to provide:
                    - interpreted_scname (without authority: simple binomial or monomial)
                    - accepted_tnrs_id (optional, in that being NULL indicates validity)
                    - sensu (optional)
                    - note (optional)
                The following fields would be automatically:
                    - tnrs_version: "Added by <username>"
                    - url: blank
                We need to check that both interpreted_scname and accepted_tnrs_id are not
                in the database -- but they're both indexed, so we should be fine.
                Create a new name in tnrs_names with the details provided by the user.
                Set layer_metadata.tnrs_id to the new name.
        4. We'll add stuff at the bottom to let people know what to do what we're going to do.
           We should also do some checking to make sure that the data isn't updated while the
           user is choosing.

4. What happens when our reference TNRS(es) changes. Note that the following queries are
    only specific to a particular tnrs_version.

        tnrs_names: The TNRS we are replacing.

    1. For every id in tnrs_names where tnrs_version: {SQL API: SELECT tnrs_id WHERE tnrs_version}
            {SQL API: SELECT MD5(all fields)}
            {SQL API: SELECT * WHERE tnrs_id}
        1. Check if that 'tnrs_id' is present in the new TNRS.
            This is just assumed, but it's best to double-check.
        2. Check if the 'interpreted_scname' and 'sensu' have changed.
            If so, throw an error.
        3. Check if the 'accepted_tnrs_id' has changed.
            If so, throw an error.
        4. Update the 'tnrs_version' and 'url'.
        5. Copy this record to tnrs_names_new, including id.
            {SQL API: UPDATE statement WHERE id=? AND md5(all fields)=previous_md5}

5. Splits and lumps

    ?!?
