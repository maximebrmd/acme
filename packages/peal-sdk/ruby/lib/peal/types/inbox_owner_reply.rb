# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxOwnerReply < Internal::Types::Model
      field :moderation, -> { Peal::Types::InboxOwnerReplyModeration }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"
    end
  end
end
