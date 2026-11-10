# frozen_string_literal: true

module Peal
  module Inbox
    module Types
      class NewInboxReply < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :comment_id, -> { String }, optional: false, nullable: false, api_name: "commentId"

        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
