# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxCommentState
      extend Peal::Internal::Types::Enum

      NEW = "new"
      ANSWERED = "answered"
      HIDDEN = "hidden"
      DELETED = "deleted"
    end
  end
end
