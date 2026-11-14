# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentRuleMatch < Internal::Types::Model
      field :code, -> { String }, optional: false, nullable: true

      field :comment_id, -> { String }, optional: false, nullable: false, api_name: "commentId"

      field :looked_at, -> { String }, optional: false, nullable: false, api_name: "lookedAt"

      field :outcome, -> { Peal::Types::CommentRuleOutcome }, optional: false, nullable: false

      field :reply_id, -> { String }, optional: false, nullable: true, api_name: "replyId"
    end
  end
end
