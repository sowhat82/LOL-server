use lol;

create table IF NOT EXISTS users (
-- 		userID int not null auto_increment,
		userName varchar(50),
		password varchar(255),
		primary key (userName)

);
create table IF NOT EXISTS favouriteWines (
		ID int not null auto_increment,
		wineID varchar(255),
        wineName varchar(255),
        country varchar(255),
		userName varchar(255),
        digitalOceanKey varchar(255),
		primary key (ID),
			constraint fk_userName
			foreign key(userName)
			references users(userName)
);

insert into users (userName, password) values 
('alvin', sha('alvin'))
;
insert into users (userName, password) values 
('1', sha('1')),
('fred', sha('fred')),
('barney', sha('barney'))
;

insert into favouritewines (wineID, wineName, userName, digitalOceanKey ) values ("?","?","?", "?");

SELECT * FRoM lists;
select * from lists where listID = last_insert_id();
SELECT * FRoM tasks;
SELECT count(*) FRoM tasks;

drop table users;
drop table favouritewines;


UPDATE lists SET taskCount = ? WHERE listID = ?;


update lists set image = ? where listID = last_insert_id()