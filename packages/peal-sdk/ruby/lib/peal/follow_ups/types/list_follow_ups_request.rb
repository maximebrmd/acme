# frozen_string_literal: true

module Peal
  module FollowUps
    module Types
      class ListFollowUpsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :post_id, -> { String }, optional: true, nullable: false, api_name: "postId"

        field :status, -> { Peal::Types::FollowUpRuleStatus }, optional: true, nullable: false
      end
    end
  end
end
