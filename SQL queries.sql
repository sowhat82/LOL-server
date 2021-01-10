use lol;

create table IF NOT EXISTS users (
		userID int not null auto_increment,
		userName varchar(50),
		password varchar(255),
		primary key (userID)

);
create table IF NOT EXISTS favouriteWines (
		wineID int not null auto_increment,
		userID int not null,
		primary key (wineID),
			constraint fk_user_id
			foreign key(userID)
			references users(userID)
);

insert into users (userName, password) values 
('1', sha('1users'));


SELECT * FRoM lists;
select * from lists where listID = last_insert_id();
SELECT * FRoM tasks;
SELECT count(*) FRoM tasks;

drop table lists;
drop table tasks;


UPDATE lists SET taskCount = ? WHERE listID = ?;


update lists set image = ? where listID = last_insert_id()