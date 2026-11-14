# frozen_string_literal: true

module Peal
  module InboxRules
    module Types
      class ListCommentRulesInboxRulesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :status, -> { Peal::Types::CommentRuleStatus }, optional: true, nullable: false
      end
    end
  end
end
