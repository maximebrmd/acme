# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module Role
      extend Peal::Internal::Types::Enum

      OWNER = "owner"
      ADMIN = "admin"
      EDITOR = "editor"
      CONTRIBUTOR = "contributor"
      VIEWER = "viewer"
    end
  end
end
