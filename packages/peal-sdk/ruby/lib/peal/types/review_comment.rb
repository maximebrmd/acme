# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewComment < Internal::Types::Model
      field :anchor, -> { Peal::Types::CommentAnchor }, optional: false, nullable: true

      field :author, -> { Peal::Types::Reviewer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :parent_id, -> { String }, optional: false, nullable: true, api_name: "parentId"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :resolved, -> { Peal::Types::ReviewCommentResolved }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
