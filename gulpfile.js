'use strict';
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var inject = require('gulp-inject');
var ghPages = require('gulp-gh-pages');

gulp.task('minify', function () {
    gulp.src('src/app/app.js')
        .pipe(uglify())
        .pipe(gulp.dest('build'))
});

gulp.task('injectjs', function(){
    var target = gulp.src('./src/index.html');
    var sources = gulp.src('src/app/**/*.js');

    return target.pipe(inject(sources, {relative: true}))
        .pipe(gulp.dest('./src'));
});

gulp.task('js', function () {
    return gulp.src('src/app/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(concat('app.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('content', function(){
    gulp.src(['src/index.html', 'src/resume.json'])
        .pipe(gulp.dest('dist'));
});

gulp.task('css', function(){
    gulp.src('src/styles/*.css')
        .pipe(gulp.dest('dist/styles'));
});

gulp.task('build', ['js', 'css', 'content'], function(){
    var target = gulp.src('./dist/index.html');
    var sources = gulp.src('./dist/*.js');

    return target.pipe(inject(sources, {relative: true}))
        .pipe(gulp.dest('./dist'));
});

gulp.task('deploy', function() {
    return gulp.src('./dist/**/*')
        .pipe(ghPages());
});

gulp.task('default', ['injectjs']);