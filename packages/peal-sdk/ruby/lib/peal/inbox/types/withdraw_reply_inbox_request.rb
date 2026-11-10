# frozen_string_literal: true

module Peal
  module Inbox
    module Types
      class WithdrawReplyInboxRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :reply_id, -> { String }, optional: false, nullable: false, api_name: "replyId"
      end
    end
  end
end
