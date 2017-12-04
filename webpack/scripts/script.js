import $ from 'jquery';

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    var slice = Array.prototype.slice; // save ref to original slice()
    var splice = Array.prototype.splice; // save ref to original slice()

    var defaults = {
            topSpacing: 0,
            bottomSpacing: 0,
            className: 'is-sticky',
            wrapperClassName: 'sticky-wrapper',
            center: false,
            getWidthFrom: '',
            widthFromWrapper: true, // works only when .getWidthFrom is empty
            responsiveWidth: false,
            zIndex: 'inherit'
        },
        $window = $(window),
        $document = $(document),
        sticked = [],
        windowHeight = $window.height(),
        scroller = function() {
            var scrollTop = $window.scrollTop(),
                documentHeight = $document.height(),
                dwh = documentHeight - windowHeight,
                extra = (scrollTop > dwh) ? dwh - scrollTop : 0;

            for (var i = 0, l = sticked.length; i < l; i++) {
                var s = sticked[i],
                    elementTop = s.stickyWrapper.offset().top,
                    etse = elementTop - s.topSpacing - extra;

                //update height in case of dynamic content
                s.stickyWrapper.css('height', s.stickyElement.outerHeight());

                if (scrollTop <= etse) {
                    if (s.currentTop !== null) {
                        s.stickyElement
                            .css({
                                'width': '',
                                'position': '',
                                'top': '',
                                'z-index': ''
                            });
                        s.stickyElement.parent().removeClass(s.className);
                        s.stickyElement.trigger('sticky-end', [s]);
                        s.currentTop = null;
                    }
                }
                else {
                    var newTop = documentHeight - s.stickyElement.outerHeight()
                        - s.topSpacing - s.bottomSpacing - scrollTop - extra;
                    if (newTop < 0) {
                        newTop = newTop + s.topSpacing;
                    } else {
                        newTop = s.topSpacing;
                    }
                    if (s.currentTop !== newTop) {
                        var newWidth;
                        if (s.getWidthFrom) {
                            padding =  s.stickyElement.innerWidth() - s.stickyElement.width();
                            newWidth = $(s.getWidthFrom).width() - padding || null;
                        } else if (s.widthFromWrapper) {
                            newWidth = s.stickyWrapper.width();
                        }
                        if (newWidth == null) {
                            newWidth = s.stickyElement.width();
                        }
                        s.stickyElement
                            .css('width', newWidth)
                            .css('position', 'fixed')
                            .css('top', newTop)
                            .css('z-index', s.zIndex);

                        s.stickyElement.parent().addClass(s.className);

                        if (s.currentTop === null) {
                            s.stickyElement.trigger('sticky-start', [s]);
                        } else {
                            // sticky is started but it have to be repositioned
                            s.stickyElement.trigger('sticky-update', [s]);
                        }

                        if (s.currentTop === s.topSpacing && s.currentTop > newTop || s.currentTop === null && newTop < s.topSpacing) {
                            // just reached bottom || just started to stick but bottom is already reached
                            s.stickyElement.trigger('sticky-bottom-reached', [s]);
                        } else if(s.currentTop !== null && newTop === s.topSpacing && s.currentTop < newTop) {
                            // sticky is started && sticked at topSpacing && overflowing from top just finished
                            s.stickyElement.trigger('sticky-bottom-unreached', [s]);
                        }

                        s.currentTop = newTop;
                    }

                    // Check if sticky has reached end of container and stop sticking
                    var stickyWrapperContainer = s.stickyWrapper.parent();
                    var unstick = (s.stickyElement.offset().top + s.stickyElement.outerHeight() >= stickyWrapperContainer.offset().top + stickyWrapperContainer.outerHeight()) && (s.stickyElement.offset().top <= s.topSpacing);

                    if( unstick ) {
                        s.stickyElement
                            .css('position', 'absolute')
                            .css('top', '')
                            .css('bottom', 0)
                            .css('z-index', '');
                    } else {
                        s.stickyElement
                            .css('position', 'fixed')
                            .css('top', newTop)
                            .css('bottom', '')
                            .css('z-index', s.zIndex);
                    }
                }
            }
        },
        resizer = function() {
            windowHeight = $window.height();

            for (var i = 0, l = sticked.length; i < l; i++) {
                var s = sticked[i];
                var newWidth = null;
                if (s.getWidthFrom) {
                    if (s.responsiveWidth) {
                        newWidth = $(s.getWidthFrom).width();
                    }
                } else if(s.widthFromWrapper) {
                    newWidth = s.stickyWrapper.width();
                }
                if (newWidth != null) {
                    s.stickyElement.css('width', newWidth);
                }
            }
        },
        methods = {
            init: function(options) {
                return this.each(function() {
                    var o = $.extend({}, defaults, options);
                    var stickyElement = $(this);

                    var stickyId = stickyElement.attr('id');
                    var wrapperId = stickyId ? stickyId + '-' + defaults.wrapperClassName : defaults.wrapperClassName;
                    var wrapper = $('<div></div>')
                        .attr('id', wrapperId)
                        .addClass(o.wrapperClassName);

                    stickyElement.wrapAll(function() {
                        if ($(this).parent("#" + wrapperId).length == 0) {
                            return wrapper;
                        }
                    });

                    var stickyWrapper = stickyElement.parent();

                    if (o.center) {
                        stickyWrapper.css({width:stickyElement.outerWidth(),marginLeft:"auto",marginRight:"auto"});
                    }

                    if (stickyElement.css("float") === "right") {
                        stickyElement.css({"float":"none"}).parent().css({"float":"right"});
                    }

                    o.stickyElement = stickyElement;
                    o.stickyWrapper = stickyWrapper;
                    o.currentTop    = null;

                    sticked.push(o);

                    methods.setWrapperHeight(this);
                    methods.setupChangeListeners(this);
                });
            },

            setWrapperHeight: function(stickyElement) {
                var element = $(stickyElement);
                var stickyWrapper = element.parent();
                if (stickyWrapper) {
                    stickyWrapper.css('height', element.outerHeight());
                }
            },

            setupChangeListeners: function(stickyElement) {
                if (window.MutationObserver) {
                    var mutationObserver = new window.MutationObserver(function(mutations) {
                        if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
                            methods.setWrapperHeight(stickyElement);
                        }
                    });
                    mutationObserver.observe(stickyElement, {subtree: true, childList: true});
                } else {
                    if (window.addEventListener) {
                        stickyElement.addEventListener('DOMNodeInserted', function() {
                            methods.setWrapperHeight(stickyElement);
                        }, false);
                        stickyElement.addEventListener('DOMNodeRemoved', function() {
                            methods.setWrapperHeight(stickyElement);
                        }, false);
                    } else if (window.attachEvent) {
                        stickyElement.attachEvent('onDOMNodeInserted', function() {
                            methods.setWrapperHeight(stickyElement);
                        });
                        stickyElement.attachEvent('onDOMNodeRemoved', function() {
                            methods.setWrapperHeight(stickyElement);
                        });
                    }
                }
            },
            update: scroller,
            unstick: function(options) {
                return this.each(function() {
                    var that = this;
                    var unstickyElement = $(that);

                    var removeIdx = -1;
                    var i = sticked.length;
                    while (i-- > 0) {
                        if (sticked[i].stickyElement.get(0) === that) {
                            splice.call(sticked,i,1);
                            removeIdx = i;
                        }
                    }
                    if(removeIdx !== -1) {
                        unstickyElement.unwrap();
                        unstickyElement
                            .css({
                                'width': '',
                                'position': '',
                                'top': '',
                                'float': '',
                                'z-index': ''
                            })
                        ;
                    }
                });
            }
        };

    // should be more efficient than using $window.scroll(scroller) and $window.resize(resizer):
    if (window.addEventListener) {
        window.addEventListener('scroll', scroller, false);
        window.addEventListener('resize', resizer, false);
    } else if (window.attachEvent) {
        window.attachEvent('onscroll', scroller);
        window.attachEvent('onresize', resizer);
    }

    $.fn.sticky = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.sticky');
        }
    };

    $.fn.unstick = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method ) {
            return methods.unstick.apply( this, arguments );
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.sticky');
        }
    };
    $(function() {
        setTimeout(scroller, 0);
    });
}));


$(document).ready(function () {
    window.moment = moment;
    window.$ = $;
    window.$.QueryString = (function (paramsArray) {
        var params = {};

        for (var i = 0; i < paramsArray.length; ++i) {
            var param = paramsArray[i]
                .split('=', 2);
            if (param.length !== 2)
                continue;
            params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, " "));
        }

        return params;
    })(window.location.search.substr(1).split('&'));


    var Driver = function () {

        var Controller = function () {
            this.init = function () {
                bindEventToComponent()
            }

            function bindEventToComponent() {
                // console.log('init controller for component');
                //   setTimeout(function(){
                //     $('.select-click').on('click', function(){
                //     $(".active-popup").show();
                //   });
                //   // close log event
                //   $('.icon-close-pop').click(function(){
                //     $(".active-popup").hide();
                //   });
                //   $(".active-popup").hide();
                // },500);

            }
        }

        var DriverSearchController = function () {
            this.init = function () {
                //bindEventToComponent();
                searchEventcomponent();
            }

            function searchEventcomponent(){
                $('.fa-search').on("click", function (event) {
                    if($('.fa-search').parents().eq(2).find('input').val().length >= 3){
                        $('.search-sub-header').parent().submit()
                    }
                });
                $('.fa-close').on("click", function (event) {
                    window.location = window.location.pathname;                    
                }); 
            }

            function bindEventToComponent() {
                var state = true;
                $('#btn-search-header').on("click", function () {
                    if (state) {
                        $(".search-sub-header").animate({
                            width: '100%',
                            padding: '6 12',
                        }, 500);
                        $("#btn-search-header").addClass("action-click");
                    }
                });
            }
        }

        var DriverDatetimePickerController = function () {
            this.init = function () {
                bindEventToComponent();
            }

            function bindEventToComponent() {
                var date = $.QueryString.date;
                if (date)
                    date = moment(date, 'MM-DD-yy').toDate();
                else
                    date = new Date();

                if ($('#datetimepicker-details').datetimepicker) {
                    $('#datetimepicker-details').datetimepicker({
                        keepOpen: true,
                        defaultDate: date,
                        format: 'MMMM D, YYYY',
                        // debug: true,
                        // allowInputToggle: true,
                        // viewDate: true,
                    }).on('dp.change', function (e) {
                        var _date = $('#datetimepicker-details input.date-input').val();
                        window.location.href = '?date=' + moment(_date).format("M-D-YYYY");
                    });
                }

            }
        }


        var AddDriverController = function () {
            this.init = function () {
                bindEventToComponent();
            }

            function bindEventToComponent() {
                $('.btn-cancel-driver.add').click(function (e) {
                    $('.add-driver-form').find("input[type=text], input[type=email], textarea, select").val('').end();
                    $('.add-driver-form').find(".validate-address-form").hide();
                    $('.has-error-driver').each(function () {
                        $(this).removeClass('has-error-driver');
                    });
                    $('#myModal').on('show.bs.modal', function (e) {
                        $(this).find("input[type=checkbox]").prop('checked', false);
                        $('.status-yes').show()
                    });
                    $('.alert-add-driver').addClass('hide');
                });
            }
        }

        var AddUserController = function () {
            this.init = function () {
                bindEventToComponent();
            }

            function bindEventToComponent() {
                $('.btn-cancel-user.add').click(function (e) {
                    $('#add-user-form').find("input[type=text], input[type=email], textarea, select").val('').end();
                    $('#add-user-form').find(".validate-address-form").hide();
                    $('.error-message').each(function () {
                        $(this).removeClass('has-error-driver');
                    });
                });


                //validator
                $('.icon-pen-logs, .btn-add-driver').on("click", function () {
                    // $("#myModal").modal('show');
                    validateForm();

                    $(".check-modal").each(function (index) {
                        if (!this.checked) {
                            $(this).parent().children('.status-yes').hide();
                            $(this).parent().children('.status-no').show();

                        } else {
                            $(this).parent().children('.status-yes').show();
                            $(this).parent().children('.status-no').hide();
                        }
                    });

                });
                function validateForm() {
                    $("#search-form").validate({
                        errorPlacement: function (error, element) {
                        },


                        rules: {
                            email: {
                                required: true,
                                email: true
                            }
                        },

                        highlight: function (element, errorClass, validClass) {
                            $(element).closest('.form-group').addClass('input-has-errors');
                            $(element).parent().addClass('has-error-driver');

                        },
                        unhighlight: function (el, error, valid) {
                            $(el).parent().removeClass('has-error-driver');
                            $(el).closest('.form-group').removeClass('input-has-errors');
                        }
                    });
                }

            }
        }


        var OpenDateLogController = function () {

            this.init = function () {
                bindEventToComponent();
            }

            function bindEventToComponent() {
                $('.pages-date-selected-open .view-date-datalabel > a').on("click", function () {
                    $('.pages-date-selected-open .top-date-range').css("display", "block");
                    $(this).css("display", "none");
                    $('.wrap-tabs').hide();
                    $('.btn-download').hide();
                    $('.select-date-start,.select-date-end').datetimepicker({
                        format: 'MM-DD-YYYY'
                    });
                    $('.select-date-start,.select-date-end').on("dp.change", function (e) {
                    });
                });
                // $('.top-date-range').find('.clear-sort .clear-data').on("click",function () {
                //   $('.form-date-logs').remove('has-error-driver');
                //   $('input[name=from]').val("");
                //   $('input[name=to]').val("");
                //   $('.pages-date-selected-open').find(".date").text("DATE RANGE");
                //   $('.pages-date-selected-open .top-date-range').css("display","none");
                //   $(".view-date-datalabel > a").css("display","inline-block");
                //   $('.wrap-tabs').show();
                // });

                $('.top-date-range').find('.button-sort').on('click', function (e) {
                    var start_date = $('input[name=from]').val();
                    var end_date = $('input[name=to]').val();
                    if(new Date(end_date) - new Date(start_date) > 60*60*24*1000*180){
                        $('.form-date-logs').addClass('has-error-driver');
                        return;
                    }
                    if (start_date && end_date && start_date <= end_date && !window.location.hash) {
                        e.preventDefault();
                        window.location.href = window.location.origin + window.location.pathname + "?from=" + start_date + '&' + 'to=' + end_date;
                    }
                    else {
                        $('.form-date-logs').addClass('has-error-driver');
                    }
                });

                
            }

        }

        var EditDriverController = function () {
            var self = this;
            self.state = {};
            this.init = function () {
                historyData();
                bindEventToComponent();
            }

            function historyData() {
                self.state = {
                    email: $('input[name=email]').val(),
                    enable_yard_move: $('input[name=enable_yard_move]').prop('checked'),
                    enable_personal_conveyance: $('input[name=enable_personal_conveyance]').prop('checked'),
                    exempt_driver_from_hos_rules: $('input[name=exempt_driver_from_hos_rules]').prop('checked'),
                    status: $(".de-activate-driver").hasClass('active') ? 'inactive' : 'active',
                    active: '1',
                    inactive: '0'
                };
            }

            function bindEventToComponent() {

                $('.btn-cancel-driver.edit').click(function (e) {
                    $('input[name=email]').val(self.state.email);
                    $('input[name=enable_yard_move]').prop('checked', self.state.enable_yard_move);
                    $('input[name=enable_personal_conveyance]').prop('checked', self.state.enable_personal_conveyance);
                    $('input[name=exempt_driver_from_hos_rules]').prop('checked', self.state.exempt_driver_from_hos_rules);
                    $('form').find('input[name=status]').val(self.state[self.state.status]);
                    if (self.state.status === 'active') {
                        $(".re-activate-driver").hide();
                        $(".de-activate-driver").show();
                    }
                    else {
                        $(".re-activate-driver").show();
                        $(".de-activate-driver").hide();
                    }
                    $(".content-re-activate").hide();
                    $(".content-de-activate").hide();
                    $(".row-alert-success").show();
                });

                if ($('.re-activate-driver').hasClass('active')) {
                    $(".re-activate-driver").hide();
                    $(".de-activate-driver").show();
                }
                if ($('.de-activate-driver').hasClass('active')) {
                    $(".re-activate-driver").show();
                    $(".de-activate-driver").hide();
                }
                // re activate driver
                $('.re-activate-driver').click(function () {
                    $(".content-re-activate").show();
                    $(".row-alert-success").hide();
                });
                // Cancel btn
                $('.btn-cancel').click(function () {
                    $(".content-re-activate").hide();
                    $(".content-de-activate").hide();
                    $(".row-alert-success").show();
                });

                $('.btn-confirm').click(function () {
                    $(".re-activate-driver").hide();
                    $(".de-activate-driver").show();
                    $(".content-re-activate").hide();
                    $('form').find('input[name=status]').val(self.state.active);
                    $(".row-alert-success").show();
                });
                $('.de-activate-driver').click(function () {
                    $(".row-alert-success").hide();
                    $(".content-de-activate").show();
                });

                $('.btn-confirm-de').click(function () {
                    $(".re-activate-driver").show();
                    $(".de-activate-driver").hide();
                    $(".row-alert-success").show();
                    $(".content-de-activate").hide();
                    $('form').find('input[name=status]').val(self.state.inactive);
                })
            }
        }

        var DriverRequestedController = function () {
            this.init = function () {
                bindEventToComponent();
            }

            function bindEventToComponent() {
                $('.user-driver-details .button-carrier').find('button.btn-success').on('click', function (e) {
                    $(this).closest('form').append('<input type="hidden" name="driver_status" value="1"/>');
                    $.ajax({
                        url: '/api' + window.location.pathname,
                        method: "PUT",
                        data: JSON.stringify({
                            driver_status: '1',
                            id: driver_id,
                        }),
                        dataType: "json",
                        contentType: "application/json; charset=utf-8",
                        // headers: {"Authorization": localStorage.getItem('token')},
                        success: function (response) {
                            $('.driver_requested').addClass('hidden');
                            $('.icon-edit-logs.icon-edit-top-right').removeClass('hidden');
                            $('.status-bottom').removeClass('hidden');

                            if (total_page != 0) {
                                $('.driver_log').removeClass('hidden');
                            }
                            else if (total_page == 0) {
                                $('.driver_empty').removeClass('hidden');
                            }
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            console.log(textStatus, errorThrown);
                        }
                    });
                });
                
                $('.user-driver-details .button-carrier').find('button.btn-danger').on('click', function (e) {
                    $.ajax({
                        url: '/api' + window.location.pathname,
                        method: "DELETE",
                        dataType: "json",
                        contentType: "application/json; charset=utf-8",
                        success: function (response) {
                            window.location.href = "/drivers";
                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            console.log(textStatus, errorThrown);
                        }
                    });
                });
            }
        }
        var SortController = function () {
            var self = this;
            self.prefix = '.s_';

            this.init = function () {
                bindEventToComponent();
            }

            function enable_sort(name, parent, column_name) {
                var $key = $(parent + self.prefix + name);
                var asc = new RegExp("\\?sort=" + name + ":asc");
                var desc = new RegExp("\\?sort=" + name + ":desc");
                if (window.location.search.match(asc)) {
                    $key.addClass('asc');
                    $key.html('<p class="">' + column_name + ' <i class="fa fa-sort-asc" aria-hidden="true"></i></p>');
                }
                else if (window.location.search.match(desc)) {
                    $key.addClass('desc');
                    $key.html('<p class="">' + column_name + ' <i class="fa fa-sort-desc" aria-hidden="true"></i></p>');
                }
            }

            function sort_by(name, parent) {
                var $key = $(parent + self.prefix + name);
                $key.on('click', function (e) {
                    e.preventDefault();
                    var search = "";
                    var query = window.location.search.substring(1, window.location.search.length)
                        .replace(/sort=\w+:(asc|desc)?&/, "")
                        .replace(/sort=\w+:(asc|desc)/, "");
                    ;
                    if (query) {
                        search = "&" + query;
                    }
                    if ($key.hasClass('asc')) {
                        // $key.addClass('desc');
                        // $key.removeClass('asc');
                        // $key.html('<a>NAME (LAST, A-Z) <i class="fa fa-sort-desc" aria-hidden="true"></i></a>');

                        window.location.href = '?sort=' + name + ':desc' + search.replace("&&", "&");
                    }
                    else {
                        // $key.addClass('asc');
                        // $key.removeClass('desc');
                        // $key.html('<a>NAME (LAST, A-Z) <i class="fa fa-sort-asc" aria-hidden="true"></i></a>');
                        window.location.href = '?sort=' + name + ':asc' + search.replace("&&", "&");
                    }
                });
            }

            function bindEventToComponent() {
                [['name', '.drivers ', 'NAME (LAST, A-Z)'],
                    ['status', '.drivers ', 'STATUS'],
                    ['location', '.drivers ', 'LOCATION'],
                    ['violation', '.drivers ', 'VIOLATIONS TODAY'],
                    ['issue', '.drivers ', 'PAST LOG ISSUES'],
                    ['report_date', '.logs ', 'DATE'],
                    ['name', '.logs ', 'DRIVER'],
                    ['shift_hours', '.logs ', 'SHIFT HOURS'],
                    ['distance', '.logs ', 'DISTANCE'],
                    ['hos_violations', '.logs ', 'HOS VIOLATIONS'],
                    ['issue', '.logs ', 'FORM ISSUES'],
                    ['name', '.devices ', 'CURRENT_DRIVER'],
                    ['serial_no', '.devices ', 'SERIAL NO'],
                    ['status', '.devices ', 'STATUS NO'],
                    ['number', '.devices ', 'NUMBERS'],
                    ['name', '.users ', 'NAME'],
                    ['role', '.users ', 'ROLE'],
                    ['last_login', '.users ', 'LAST LOGIN'],
                    ['email', '.users ', 'EMAIL/LOGIN'],
                    ['created_time', '.inspections ', 'DATE'],
                    ['name', '.inspections ', 'DRIVER'],
                ].forEach(function (value) {
                    sort_by(value[0], value[1]);
                    enable_sort(value[0], value[1], value[2]);
                })
            }
        }


        return {
            init: function () {
                $.each([
                    new Controller(), 
                    new DriverSearchController(), 
                    new DriverDatetimePickerController(),
                    new AddDriverController(), 
                    new EditDriverController(), 
                    new DriverRequestedController(),
                    new OpenDateLogController(), 
                    new SortController(), 
                    new AddUserController()
                ], 
                    function (index, obj) {
                    obj.init();
                });
            }
        }
    }();

    Driver.init();


    // tab setting profile
    $('#myTabs a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    });

    $('.list-menu-icon').click(function () {
        $(".sidebar-drive").toggleClass('active');
    });


    // datetime

    // $(function () {
    //   $('#datetimepicker').datetimepicker({
    //     keepOpen: true,
    //     // debug: true
    //   });
    // });


    // $(function () {
    //   $('.input-datetime-picker').datetimepicker({
    //       format: 'LT',
    //   });
    // });


    var checkbox = $(".check-modal");


    $(".check-modal").change(function () {
        if (!this.checked) {
            $(this).parent().children('.status-yes').hide();
            $(this).parent().children('.status-no').show();

        } else {
            $(this).parent().children('.status-yes').show();
            $(this).parent().children('.status-no').hide();
        }
    });


    // $('#myModal').on('hidden.bs.modal', function (e) {
    //   var history_state = {
    //     'first_name': $(".input, textarea, select").val
    //   };
    //   $(this).find('.validate-address-form').hide();
    //   $(this)
    //     .find("input[type=text], input[type=email], textarea, select").val('').end();
    // });

    $("#change-company-logo").click(function () {
        $(".company-logo").click();
    });

    function readURL(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#avatar').attr('src', e.target.result);
            }

            reader.readAsDataURL(input.files[0]);
        }
    }

    $(".company-logo").change(function () {
        readURL(this);
    });

    // $(window).scroll(function () {
    //     var sticky = $('.freeze-sub-header');
    //     var scrollTop = $(window).scrollTop();
    //     if(scrollTop > 60) sticky.addClass('fixed');
    //     else sticky.removeClass('fixed');
    //
    // });
    $(".freeze-sub-header").sticky({topSpacing:0,zIndex:87786});
    // tabs history
    $('.list-top-header-log_events__tabs a').click(function(){
        var tab_id = $(this).attr('data-tab');

        $('.list-top-header-log_events__tabs a').removeClass('current');
        $('.content-tabs__events').removeClass('current');

        $(this).addClass('current');
        $("#"+tab_id).addClass('current');
        return false;
    });

})