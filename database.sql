create database tasks_db;

use tasks_db;


CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1-active,2-inactive\r\n',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci


CREATE TABLE `tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('todo','in-progress','done') DEFAULT 'todo',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `owner` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `owner` (`owner`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`owner`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

#Query : Get a User's Tasks by Status
SELECT
    id,
    title,
    description,
    status,
    priority,
    due_date,
    created_at,
    last_updated_at
FROM tasks
WHERE owner = 5
  AND status = 'in-progress'
ORDER BY due_date ASC, id ASC;

#Query: Admin View of All Tasks With Owner Information
SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.created_at,
    t.last_updated_at,
    u.id AS owner_id,
    u.name AS owner_name,
    u.email AS owner_email
FROM tasks AS t
LEFT JOIN users AS u
    ON u.id = t.owner
ORDER BY t.created_at DESC;

#Query: Task Counts Per User

SELECT
    u.id,
    u.name,
    u.email,
    COUNT(t.id) AS task_count
FROM users AS u
LEFT JOIN tasks AS t
    ON t.owner = u.id
GROUP BY
    u.id,
    u.name,
    u.email
ORDER BY task_count DESC;