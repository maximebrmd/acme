# frozen_string_literal: true

module Peal
  module Articles
    class Client
      # @param client [Peal::Internal::Http::RawClient]
      #
      # @return [void]
      def initialize(client:)
        @client = client
      end

      # Lists the workspace's articles, newest first, 50 a page unless `limit` (at most 100) says otherwise, those in
      # one `status` when it is given. Pass the page's `nextCursor` as `cursor` for the next. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String, nil] :cursor
      # @option params [String, nil] :limit
      # @option params [Peal::Types::ArticleStateName, nil] :status
      #
      # @example
      #   client.articles.list(workspace_id: "workspaceId")
      #
      # @return [Peal::Types::ArticlePage]
      def list(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        query_params = {}
        query_params["cursor"] = params[:cursor] if params.key?(:cursor)
        query_params["limit"] = params[:limit] if params.key?(:limit)
        query_params["status"] = params[:status] if params.key?(:status)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles",
          query: query_params,
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::ArticlePage.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Writes an article for one of the workspace's websites (a channel connected with connectSite): a draft, or
      # scheduled at once with `schedule`. A scheduled article is checked as the site would take it (ArticleRejected
      # lists every violation); its images are files of the workspace's library, ready (UnknownMedia otherwise), the
      # cover an image. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles
      # cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows.
      # Needs post:create, and post:schedule with `schedule`.
      #
      # @param request_options [Hash]
      # @param params [Peal::Articles::Types::NewArticle]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      #
      # @example
      #   client.articles.create(
      #     workspace_id: "workspaceId",
      #     body: {
      #       content: [],
      #       type: "doc"
      #     },
      #     title: "title",
      #     channel_id: "channelId"
      #   )
      #
      # @return [Peal::Types::Article]
      def create(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request_data = Peal::Articles::Types::NewArticle.new(params).to_h
        non_body_param_names = %w[workspaceId]
        body = request_data.except(*non_body_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles",
          body: body,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Reads an article. Needs post:read.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.get(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId"
      #   )
      #
      # @return [Peal::Types::Article]
      def get(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "GET",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Deletes the article from Peal, and its job when it waits to go out; never while it is being sent. A post already
      # on the site stays there: unpublish it first. Needs post:delete.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.delete(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId"
      #   )
      #
      # @return [untyped]
      def delete(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "DELETE",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}",
          request_options: request_options
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        return if code.between?(200, 299)

        error_class = Peal::Errors::ResponseError.subclass_for_code(code)
        error_types = {
          401 => Peal::Types::UnauthenticatedEncoded
        }
        error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
        raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
      end

      # Replaces what a draft, a scheduled article or one that failed says. A scheduled article is checked again and
      # keeps its time; it is refused (ArticleRejected `approvalRequired`) while your posts need an approval. Once on
      # the site, use updateOnSite. Needs post:update.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::ArticleInput]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.update(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId",
      #     body: {
      #       content: [],
      #       type: "doc"
      #     },
      #     title: "title"
      #   )
      #
      # @return [Peal::Types::Article]
      def update(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id article_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "PATCH",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}",
          body: Peal::Types::ArticleInput.new(body_params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Schedules a draft, moves a scheduled article, or schedules one that failed again: Peal sends it at `at`, or now
      # without it, and the site makes it what `siteStatus` says. With `future`, the site publishes it at `at`, which
      # must be ahead, and Peal sends it at once. Everything is checked as the site would take it. What goes out is
      # public, and cannot be taken back from Peal but by unpublishing it. Refused (ArticleRejected `approvalRequired`)
      # while your posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace
      # holds more channels or members than its plan allows. Needs post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::ArticleTime]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.schedule(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId",
      #     time_zone: "timeZone"
      #   )
      #
      # @return [Peal::Types::Article]
      def schedule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id article_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}/schedule",
          body: Peal::Types::ArticleTime.new(body_params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Takes a scheduled article back to draft: nothing is sent. Needs post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.unschedule(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId"
      #   )
      #
      # @return [Peal::Types::Article]
      def unschedule(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}/unschedule",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Sends a failed article again now, or one that was unconfirmed once a member checked it is not on the site: Peal
      # never sends an unconfirmed article again on its own. Refused (ArticleRejected `approvalRequired`) while your
      # posts need an approval, which articles cannot have yet, and (PlanLimitReached) while the workspace holds more
      # channels or members than its plan allows. Needs post:schedule.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.retry_(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId"
      #   )
      #
      # @return [Peal::Types::Article]
      def retry_(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}/retry",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Moves the article's post to the site's trash, where the site keeps it for a while (30 days by default on
      # WordPress) before deleting it; it stays published in Peal, with `removedAt`. Needs post:publish; an OAuth client
      # needs the scope workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Hash]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.unpublish(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId"
      #   )
      #
      # @return [Peal::Types::Article]
      def unpublish(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}/unpublish",
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end

      # Replaces what the article's post says on the site (title, body, excerpt, tags, categories, cover), at once: the
      # site keeps its status and its date, and files it has already are not sent again; a cover or an excerpt removed
      # is removed there. Refused (ArticleRejected `approvalRequired`) while your posts need an approval, which articles
      # cannot have yet, and (PlanLimitReached) while the workspace holds more channels or members than its plan allows.
      # Needs post:publish; an OAuth client needs the scope workspace:publish.
      #
      # @param request_options [Hash]
      # @param params [Peal::Types::ArticleInput]
      # @option request_options [String] :base_url
      # @option request_options [Hash{String => Object}] :additional_headers
      # @option request_options [Hash{String => Object}] :additional_query_parameters
      # @option request_options [Hash{String => Object}] :additional_body_parameters
      # @option request_options [Integer] :timeout_in_seconds
      # @option params [String] :workspace_id
      # @option params [String] :article_id
      #
      # @example
      #   client.articles.update_on_site(
      #     workspace_id: "workspaceId",
      #     article_id: "articleId",
      #     body: {
      #       content: [],
      #       type: "doc"
      #     },
      #     title: "title"
      #   )
      #
      # @return [Peal::Types::Article]
      def update_on_site(request_options: {}, **params)
        params = Peal::Internal::Types::Utils.normalize_keys(params)
        path_param_names = %i[workspace_id article_id]
        body_params = params.except(*path_param_names)

        request = Peal::Internal::JSON::Request.new(
          base_url: request_options[:base_url],
          method: "POST",
          path: "api/workspaces/#{URI.encode_uri_component(params[:workspace_id].to_s)}/articles/#{URI.encode_uri_component(params[:article_id].to_s)}/site",
          body: Peal::Types::ArticleInput.new(body_params).to_h,
          request_options: request_options,
          max_retries: 0
        )
        begin
          response = @client.send(request)
        rescue Net::HTTPRequestTimeout
          raise Peal::Errors::TimeoutError
        end
        code = response.code.to_i
        if code.between?(200, 299)
          (response.body.to_s.empty? ? nil : Peal::Types::Article.load(response.body))
        else
          error_class = Peal::Errors::ResponseError.subclass_for_code(code)
          error_types = {
            401 => Peal::Types::UnauthenticatedEncoded
          }
          error_body = Peal::Errors::ResponseError.load_error_body(code, response.body, error_types)
          raise error_class.new(response.body, code: code, body: error_body, headers: response.to_hash)
        end
      end
    end
  end
end
