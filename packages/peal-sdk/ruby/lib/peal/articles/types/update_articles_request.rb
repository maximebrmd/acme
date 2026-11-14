# frozen_string_literal: true

module Peal
  module Articles
    module Types
      class UpdateArticlesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :article_id, -> { String }, optional: false, nullable: false, api_name: "articleId"

        field :body, -> { Peal::Types::ArticleInput }, optional: false, nullable: false
      end
    end
  end
end
