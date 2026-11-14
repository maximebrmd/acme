# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxOwnerReplyModeration
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      APPROVED = "approved"
      REJECTED = "rejected"
    end
  end
end
