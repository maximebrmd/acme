# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReplyPendingEncoded < Internal::Types::Model
      field :reply_id, -> { String }, optional: false, nullable: false, api_name: "replyId"
    end
  end
end
